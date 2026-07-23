import express, { type NextFunction, type Request, type Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';
import type {
  ChapterContent,
  LoreGlossary,
  StorySeed,
  StoryWorld,
  UserProfile,
} from '../../types';
import {
  MAX_STORY_PATCH_OPERATIONS,
  type StoryPatchOperation,
} from '../../lib/storage/storyPatch';
import { getFirebaseAdminApp } from '../firebaseAdmin';
import { logger } from '../logger';
import type {
  ApplicationPersistenceRepository,
  PersistenceMutationContext,
  PortraitSelectionInput,
} from '../persistence/applicationPersistenceRepository';

const MAX_JSON_BODY = '20mb';
const identifierSchema = z.string().trim().min(1).max(200);
const idempotencySchema = z.string().trim().min(8).max(200);
const expectedSchema = z.object({
  exists: z.boolean(),
  updatedAt: z.string().datetime().nullable(),
  syncRevision: z.string().max(200).nullable().optional(),
}).strict();
const objectValueSchema = z.record(z.string(), z.unknown());
const storyBootstrapWriteSchema = z.object({
  story: objectValueSchema,
  expected: expectedSchema.optional(),
}).strict();
const storyPatchOperationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.enum(['add', 'replace']),
    path: z.string().min(2).max(1_000),
    value: z.unknown(),
  }).strict(),
  z.object({
    op: z.literal('remove'),
    path: z.string().min(2).max(1_000),
  }).strict(),
]);
const storyPatchWriteSchema = z.object({
  patch: z.array(storyPatchOperationSchema).max(MAX_STORY_PATCH_OPERATIONS),
  expected: expectedSchema,
}).strict();
const storyWriteSchema = z.union([storyBootstrapWriteSchema, storyPatchWriteSchema]);
const chapterWriteSchema = z.object({
  content: objectValueSchema,
  expected: expectedSchema.optional(),
}).strict();
const glossaryWriteSchema = z.object({
  term: objectValueSchema,
  idempotencyKey: idempotencySchema.optional(),
}).strict();
const glossaryBatchSchema = z.object({
  terms: z.array(objectValueSchema).max(500),
  idempotencyKey: idempotencySchema.optional(),
}).strict();
const valueMutationSchema = z.object({
  value: objectValueSchema,
  expectedSyncRevision: z.string().max(200).nullable().optional(),
  idempotencyKey: idempotencySchema,
}).strict();
const seedBatchSchema = z.object({
  seeds: z.array(objectValueSchema).min(1).max(500),
  idempotencyKey: idempotencySchema,
}).strict();
const adminAccountSchema = z.object({
  patch: z.object({
    role: z.enum(['owner', 'admin', 'user']).optional(),
    premiumTier: z.enum(['mortal', 'outer_sect', 'inner_sect', 'sect_master', 'immortal']).optional(),
  }).strict(),
  idempotencyKey: idempotencySchema,
}).strict();
const portraitSchema = z.object({
  assetId: z.string().uuid(),
  prompt: z.string().max(5_000).optional(),
  description: z.string().max(2_000).optional(),
  daoRank: z.string().max(100).optional(),
  daoXp: z.number().int().nonnegative().optional(),
  powerStage: z.string().max(200).optional(),
  equippedArtifactId: z.string().max(128).nullable().optional(),
  usedReferenceImage: z.boolean().optional(),
  customization: z.object({
    frameId: z.string().max(128).nullable().optional(),
    glowId: z.string().max(128).nullable().optional(),
    bannerId: z.string().max(128).nullable().optional(),
    effectIds: z.array(z.string().max(128)).max(32).optional(),
  }).strict().optional(),
  idempotencyKey: idempotencySchema,
}).strict();

interface PersistenceLocals {
  ownerUid: string;
}

export interface PersistenceRouteDependencies {
  verifyIdToken(token: string): Promise<{ uid: string }>;
  getRepository(): Promise<ApplicationPersistenceRepository> | ApplicationPersistenceRepository;
}

let defaultRepositoryPromise: Promise<ApplicationPersistenceRepository> | undefined;

async function getDefaultRepository(): Promise<ApplicationPersistenceRepository> {
  defaultRepositoryPromise ??= import('../persistence/dataConnectApplicationRepository')
    .then(module => new module.DataConnectApplicationRepository() as ApplicationPersistenceRepository);
  try {
    return await defaultRepositoryPromise;
  } catch (error) {
    defaultRepositoryPromise = undefined;
    throw error;
  }
}

const defaultDependencies: PersistenceRouteDependencies = {
  async verifyIdToken(token) {
    const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(token, true);
    return { uid: decoded.uid };
  },
  getRepository: getDefaultRepository,
};

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return res.status(status).json({
    error: { code, message, ...(details === undefined ? {} : { details }) },
  });
}

function authenticate(dependencies: PersistenceRouteDependencies) {
  return async (req: Request, res: Response<unknown, PersistenceLocals>, next: NextFunction) => {
    const match = req.get('authorization')?.match(/^Bearer ([^\s]+)$/i);
    if (!match) {
      sendError(res, 401, 'unauthenticated', 'A Firebase ID token is required.');
      return;
    }
    try {
      const token = await dependencies.verifyIdToken(match[1]);
      if (!token.uid || token.uid.length > 128) throw new Error('Invalid Firebase uid.');
      res.locals.ownerUid = token.uid;
      next();
    } catch {
      sendError(res, 401, 'invalid_token', 'The Firebase ID token is invalid or revoked.');
    }
  };
}

function asyncRoute(
  handler: (req: Request, res: Response<unknown, PersistenceLocals>) => Promise<void>,
) {
  return (req: Request, res: Response<unknown, PersistenceLocals>, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

function mutationKey(req: Request, bodyKey?: unknown): string {
  return idempotencySchema.parse(bodyKey ?? req.get('idempotency-key'));
}

function mutationContext(req: Request, expected?: unknown): PersistenceMutationContext {
  const parsedExpected = expected === undefined ? undefined : expectedSchema.parse(expected);
  return {
    idempotencyKey: mutationKey(req),
    expected: parsedExpected === undefined
      ? undefined
      : {
          exists: parsedExpected.exists,
          updatedAt: parsedExpected.updatedAt ?? null,
          syncRevision: parsedExpected.syncRevision,
        },
  };
}

function assertOwnerField(value: Record<string, unknown>, ownerUid: string): void {
  for (const key of ['uid', 'userId', 'ownerUid']) {
    if (typeof value[key] === 'string' && value[key] !== ownerUid) {
      const error = new Error('Payload owner does not match the authenticated account.');
      (error as Error & { code?: string }).code = 'owner_mismatch';
      throw error;
    }
  }
}

function isRevisionConflict(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && ['sync/revision-changed', 'revision_conflict'].includes(String(error.code)),
  );
}

function isForbidden(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && ['forbidden', 'owner_mismatch'].includes(String(error.code)),
  );
}

export function createPersistenceRouter(
  dependencies: PersistenceRouteDependencies = defaultDependencies,
): express.Router {
  const router = express.Router();
  router.use('/api/persistence', authenticate(dependencies), express.json({ limit: MAX_JSON_BODY }));

  router.get('/api/persistence/stories', asyncRoute(async (_req, res) => {
    const repository = await dependencies.getRepository();
    res.json({ stories: await repository.listStories(res.locals.ownerUid) });
  }));

  router.get('/api/persistence/stories/:storyId', asyncRoute(async (req, res) => {
    const storyId = identifierSchema.parse(req.params.storyId);
    const repository = await dependencies.getRepository();
    res.json({ story: await repository.getStory(res.locals.ownerUid, storyId) });
  }));

  router.put('/api/persistence/stories/:storyId', asyncRoute(async (req, res) => {
    const storyId = identifierSchema.parse(req.params.storyId);
    const parsed = storyWriteSchema.parse(req.body);
    const repository = await dependencies.getRepository();
    if ('patch' in parsed) {
      const result = await repository.patchStory(
        res.locals.ownerUid,
        storyId,
        parsed.patch as StoryPatchOperation[],
        mutationContext(req, parsed.expected),
      );
      res.json({
        story: result.story,
        metrics: {
          requestBytes: Buffer.byteLength(JSON.stringify(req.body)),
          affectedRows: result.affectedRows,
          durationMs: result.durationMs,
        },
      });
      return;
    }
    if (parsed.story.id !== storyId) throw new Error('Story route and payload IDs do not match.');
    assertOwnerField(parsed.story, res.locals.ownerUid);
    const story = await repository.saveStory(
      res.locals.ownerUid,
      parsed.story as unknown as StoryWorld,
      mutationContext(req, parsed.expected),
    );
    res.json({ story });
  }));

  router.delete('/api/persistence/stories/:storyId', asyncRoute(async (req, res) => {
    const storyId = identifierSchema.parse(req.params.storyId);
    const repository = await dependencies.getRepository();
    await repository.deleteStory(
      res.locals.ownerUid,
      storyId,
      mutationContext(req),
    );
    res.status(204).send();
  }));

  router.get('/api/persistence/stories/:storyId/chapters/:chapterNumber', asyncRoute(async (req, res) => {
    const storyId = identifierSchema.parse(req.params.storyId);
    const chapterNumber = z.coerce.number().int().positive().parse(req.params.chapterNumber);
    const repository = await dependencies.getRepository();
    res.json({
      content: await repository.getChapterContent(
        res.locals.ownerUid,
        storyId,
        chapterNumber,
      ),
    });
  }));

  router.put('/api/persistence/stories/:storyId/chapters/:chapterNumber', asyncRoute(async (req, res) => {
    const storyId = identifierSchema.parse(req.params.storyId);
    const chapterNumber = z.coerce.number().int().positive().parse(req.params.chapterNumber);
    const parsed = chapterWriteSchema.parse(req.body);
    if (parsed.content.storyId !== storyId || parsed.content.chapterNumber !== chapterNumber) {
      throw new Error('Chapter route and payload identity do not match.');
    }
    assertOwnerField(parsed.content, res.locals.ownerUid);
    const repository = await dependencies.getRepository();
    const content = await repository.saveChapterContent(
      res.locals.ownerUid,
      storyId,
      parsed.content as unknown as ChapterContent,
      mutationContext(req, parsed.expected),
    );
    res.json({ content });
  }));

  router.get('/api/persistence/stories/:storyId/glossary', asyncRoute(async (req, res) => {
    const storyId = identifierSchema.parse(req.params.storyId);
    const repository = await dependencies.getRepository();
    res.json({ terms: await repository.listGlossary(res.locals.ownerUid, storyId) });
  }));

  router.post('/api/persistence/stories/:storyId/glossary', asyncRoute(async (req, res) => {
    const storyId = identifierSchema.parse(req.params.storyId);
    const parsed = glossaryWriteSchema.parse(req.body);
    const repository = await dependencies.getRepository();
    const [term] = await repository.saveGlossaryTerms(
      res.locals.ownerUid,
      storyId,
      [parsed.term as unknown as LoreGlossary],
      mutationKey(req, parsed.idempotencyKey),
    );
    res.status(201).json({ term });
  }));

  router.post('/api/persistence/stories/:storyId/glossary/batch', asyncRoute(async (req, res) => {
    const storyId = identifierSchema.parse(req.params.storyId);
    const parsed = glossaryBatchSchema.parse(req.body);
    const repository = await dependencies.getRepository();
    res.json({
      terms: await repository.saveGlossaryTerms(
        res.locals.ownerUid,
        storyId,
        parsed.terms as unknown as LoreGlossary[],
        mutationKey(req, parsed.idempotencyKey),
      ),
    });
  }));

  router.delete('/api/persistence/glossary/:termId', asyncRoute(async (req, res) => {
    const repository = await dependencies.getRepository();
    await repository.deleteGlossaryTerm(
      res.locals.ownerUid,
      identifierSchema.parse(req.params.termId),
      mutationKey(req),
    );
    res.status(204).send();
  }));

  router.get('/api/persistence/seeds', asyncRoute(async (_req, res) => {
    const repository = await dependencies.getRepository();
    res.json({ seeds: await repository.listSeeds(res.locals.ownerUid) });
  }));

  router.get('/api/persistence/seeds/:seedId', asyncRoute(async (req, res) => {
    const repository = await dependencies.getRepository();
    res.json({
      seed: await repository.getSeed(
        res.locals.ownerUid,
        identifierSchema.parse(req.params.seedId),
      ),
    });
  }));

  router.post('/api/persistence/seeds/batch', asyncRoute(async (req, res) => {
    const parsed = seedBatchSchema.parse(req.body);
    for (const seed of parsed.seeds) assertOwnerField(seed, res.locals.ownerUid);
    const repository = await dependencies.getRepository();
    res.json({
      seeds: await repository.saveSeeds(
        res.locals.ownerUid,
        parsed.seeds as unknown as StorySeed[],
        parsed.idempotencyKey,
      ),
    });
  }));

  router.put('/api/persistence/seeds/:seedId', asyncRoute(async (req, res) => {
    const seedId = identifierSchema.parse(req.params.seedId);
    const parsed = valueMutationSchema.parse(req.body);
    if (parsed.value.id !== seedId) throw new Error('Seed route and payload IDs do not match.');
    assertOwnerField(parsed.value, res.locals.ownerUid);
    const repository = await dependencies.getRepository();
    const seed = await repository.saveSeed(
      res.locals.ownerUid,
      parsed.value as unknown as StorySeed,
      {
        idempotencyKey: parsed.idempotencyKey,
        expected: {
          exists: parsed.expectedSyncRevision !== undefined,
          updatedAt: null,
          syncRevision: parsed.expectedSyncRevision,
        },
      },
    );
    res.json({ seed });
  }));

  router.delete('/api/persistence/seeds/:seedId', asyncRoute(async (req, res) => {
    const repository = await dependencies.getRepository();
    await repository.deleteSeed(
      res.locals.ownerUid,
      identifierSchema.parse(req.params.seedId),
      mutationKey(req),
    );
    res.status(204).send();
  }));

  router.get('/api/persistence/profile', asyncRoute(async (_req, res) => {
    const repository = await dependencies.getRepository();
    res.json({ profile: await repository.getProfile(res.locals.ownerUid) });
  }));

  router.put('/api/persistence/profile', asyncRoute(async (req, res) => {
    const parsed = valueMutationSchema.parse(req.body);
    assertOwnerField(parsed.value, res.locals.ownerUid);
    const repository = await dependencies.getRepository();
    const profile = await repository.saveProfile(
      res.locals.ownerUid,
      parsed.value as Partial<UserProfile>,
      {
        idempotencyKey: parsed.idempotencyKey,
        expected: {
          exists: parsed.expectedSyncRevision !== undefined,
          updatedAt: null,
          syncRevision: parsed.expectedSyncRevision,
        },
      },
    );
    res.json({ profile });
  }));

  router.post('/api/persistence/profile/image-quota/consume', asyncRoute(async (req, res) => {
    const body = z.object({ idempotencyKey: idempotencySchema }).strict().parse(req.body);
    const repository = await dependencies.getRepository();
    res.json(await repository.consumeImageQuota(res.locals.ownerUid, body.idempotencyKey));
  }));

  router.put('/api/persistence/profile/portrait', asyncRoute(async (req, res) => {
    const parsed = portraitSchema.parse(req.body);
    const { idempotencyKey, ...input } = parsed;
    const repository = await dependencies.getRepository();
    res.json({
      profile: await repository.selectPortrait(
        res.locals.ownerUid,
        input as PortraitSelectionInput,
        idempotencyKey,
      ),
    });
  }));

  router.post('/api/persistence/profile/portraits/recover', asyncRoute(async (req, res) => {
    const body = z.object({ idempotencyKey: idempotencySchema }).strict().parse(req.body);
    const repository = await dependencies.getRepository();
    res.json({
      recovered: await repository.recoverPortraits(
        res.locals.ownerUid,
        body.idempotencyKey,
      ),
    });
  }));

  router.get('/api/persistence/admin/overview', asyncRoute(async (_req, res) => {
    const repository = await dependencies.getRepository();
    res.json(await repository.getAdminOverview(res.locals.ownerUid));
  }));

  router.patch('/api/persistence/admin/accounts/:ownerUid', asyncRoute(async (req, res) => {
    const parsed = adminAccountSchema.parse(req.body);
    const repository = await dependencies.getRepository();
    res.json({
      profile: await repository.updateAdminAccount(
        res.locals.ownerUid,
        identifierSchema.parse(req.params.ownerUid),
        parsed.patch,
        parsed.idempotencyKey,
      ),
    });
  }));

  router.delete('/api/persistence/admin/stories/:storyId', asyncRoute(async (req, res) => {
    const repository = await dependencies.getRepository();
    await repository.deleteAdminStory(
      res.locals.ownerUid,
      identifierSchema.parse(req.params.storyId),
      mutationKey(req),
    );
    res.status(204).send();
  }));

  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      sendError(
        res,
        400,
        'invalid_request',
        'The persistence request is invalid.',
        error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
      );
      return;
    }
    if (isRevisionConflict(error)) {
      sendError(res, 409, 'revision_conflict', 'The remote record changed after it was read.');
      return;
    }
    if (isForbidden(error)) {
      sendError(res, 403, 'forbidden', 'The authenticated account cannot access this record.');
      return;
    }
    logger.error({ err: error }, 'Application persistence route failed');
    sendError(res, 500, 'persistence_failed', 'The persistence operation could not be completed.');
  });

  return router;
}

export const persistenceRouter = createPersistenceRouter();
