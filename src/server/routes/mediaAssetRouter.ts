import express, { type NextFunction, type Request, type Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';
import {
  MEDIA_ASSET_TYPES,
  type MediaAssetDescriptor,
  type MediaOwner,
  type SaveMediaAssetRequest,
} from '../../contracts/mediaAssets';
import { getFirebaseAdminApp } from '../firebaseAdmin';
import { logger } from '../logger';
import { MediaInputError } from '../media/mediaInput';
import { MediaAssetServiceError } from '../media/mediaAssetService';

const JSON_DATA_URL_LIMIT = 27_000_000;
const RAW_UPLOAD_LIMIT = '100mb';

const optionalUuid = z.string().uuid().optional().nullable();
const associationSchema = z.object({
  targetKind: z.string().trim().min(1).max(64),
  targetKey: z.string().trim().min(1).max(160),
  storyId: optionalUuid,
  chapterId: optionalUuid,
  entityId: optionalUuid,
  clientHistoryId: z.string().trim().min(1).max(160).optional().nullable(),
  legacyMediaId: z.string().trim().min(1).max(160).optional().nullable(),
  entityType: z.string().trim().min(1).max(64).optional().nullable(),
  promptUsed: z.string().max(12_000).optional().nullable(),
  chapterNumber: z.coerce.number().int().min(0).optional().nullable(),
  arcTitle: z.string().trim().max(500).optional().nullable(),
  label: z.string().trim().max(500).optional().nullable(),
}).strict();

const mediaMetadataSchema = z.object({
  assetType: z.enum(MEDIA_ASSET_TYPES),
  purpose: z.string().trim().min(1).max(80),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).optional(),
  association: associationSchema,
  generationJobId: optionalUuid,
  replacesAssetId: optionalUuid,
  idempotencyKey: z.string().uuid(),
}).strict();

const jsonMediaRequestSchema = mediaMetadataSchema.extend({
  source: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('data-url'),
      dataUrl: z.string().startsWith('data:').max(JSON_DATA_URL_LIMIT),
      filename: z.string().trim().min(1).max(240).optional(),
    }).strict(),
    z.object({
      kind: z.literal('remote-url'),
      url: z.string().url().max(2_048),
      filename: z.string().trim().min(1).max(240).optional(),
      expectedMimeType: z.string().trim().min(3).max(120).optional(),
    }).strict(),
  ]),
}).strict();

const rawMediaQuerySchema = z.object({
  assetType: z.enum(MEDIA_ASSET_TYPES),
  purpose: z.string().trim().min(1).max(80),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).optional(),
  targetKind: z.string().trim().min(1).max(64),
  targetKey: z.string().trim().min(1).max(160),
  storyId: optionalUuid,
  chapterId: optionalUuid,
  entityId: optionalUuid,
  generationJobId: optionalUuid,
  replacesAssetId: optionalUuid,
  idempotencyKey: z.string().uuid(),
  clientHistoryId: z.string().trim().min(1).max(160).optional().nullable(),
  legacyMediaId: z.string().trim().min(1).max(160).optional().nullable(),
  entityType: z.string().trim().min(1).max(64).optional().nullable(),
  promptUsed: z.string().max(12_000).optional().nullable(),
  chapterNumber: z.coerce.number().int().min(0).optional().nullable(),
  arcTitle: z.string().trim().max(500).optional().nullable(),
  label: z.string().trim().max(500).optional().nullable(),
  filename: z.string().trim().min(1).max(240).optional(),
}).strict();

const selectMediaAssetSchema = z.object({
  association: associationSchema.extend({
    purpose: z.string().trim().min(1).max(80),
  }),
}).strict();

const mediaAssetParamsSchema = z.object({
  assetId: z.string().uuid(),
}).strict();

export interface VerifiedMediaToken {
  uid: string;
  email?: string | null;
  name?: string | null;
  role?: 'owner' | 'admin' | 'user';
}

export interface MediaAssetRouteService {
  save(owner: MediaOwner, request: SaveMediaAssetRequest): Promise<MediaAssetDescriptor>;
  get(ownerUid: string, assetId: string): Promise<MediaAssetDescriptor | null>;
  select(ownerUid: string, assetId: string, association: SaveMediaAssetRequest['association']): Promise<MediaAssetDescriptor>;
  delete(ownerUid: string, assetId: string): Promise<void>;
}

export interface MediaAssetRouteDependencies {
  verifyIdToken(idToken: string): Promise<VerifiedMediaToken>;
  getService(): Promise<MediaAssetRouteService> | MediaAssetRouteService;
}

interface MediaResponseLocals {
  mediaOwner: MediaOwner;
}

let defaultServicePromise: Promise<MediaAssetRouteService> | undefined;

async function createDefaultService(): Promise<MediaAssetRouteService> {
  const [repositoryModule, objectStoreModule, serviceModule] = await Promise.all([
    import('../media/dataConnectMediaAssetRepository'),
    import('../media/r2ObjectStore'),
    import('../media/mediaAssetService'),
  ]);
  const allowedRemoteHosts = (process.env.MEDIA_REMOTE_SOURCE_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
  return new serviceModule.MediaAssetService(
    new repositoryModule.DataConnectMediaAssetRepository(),
    new objectStoreModule.R2ObjectStore(),
    { inputPolicy: { allowedRemoteHosts } },
  );
}

async function getDefaultService(): Promise<MediaAssetRouteService> {
  defaultServicePromise ??= createDefaultService();
  try {
    return await defaultServicePromise;
  } catch (error) {
    defaultServicePromise = undefined;
    throw error;
  }
}

const defaultDependencies: MediaAssetRouteDependencies = {
  async verifyIdToken(idToken) {
    const token = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken, true);
    return {
      uid: token.uid,
      email: typeof token.email === 'string' ? token.email : null,
      name: typeof token.name === 'string' ? token.name : null,
      role: token.role === 'owner' || token.role === 'admin' || token.role === 'user' ? token.role : undefined,
    };
  },
  getService: getDefaultService,
};

function errorResponse(res: Response, status: number, code: string, message: string, details?: unknown): Response {
  return res.status(status).json({
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
}

function authenticateMediaRequest(dependencies: MediaAssetRouteDependencies) {
  return async (_req: Request, res: Response<unknown, MediaResponseLocals>, next: NextFunction) => {
    const authorization = _req.get('authorization');
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match) {
      errorResponse(res, 401, 'unauthenticated', 'A Firebase ID token is required.');
      return;
    }

    try {
      const decoded = await dependencies.verifyIdToken(match[1]);
      if (!decoded.uid || decoded.uid.length > 128) throw new Error('Verified token did not contain a valid uid.');
      res.locals.mediaOwner = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
        ...(decoded.role ? { role: decoded.role } : {}),
      };
      next();
    } catch {
      errorResponse(res, 401, 'invalid_token', 'The Firebase ID token is invalid, expired, revoked, or belongs to a disabled user.');
    }
  };
}

function toSaveRequest(parsed: z.infer<typeof jsonMediaRequestSchema>): SaveMediaAssetRequest {
  return {
    source: parsed.source,
    assetType: parsed.assetType,
    purpose: parsed.purpose,
    visibility: parsed.visibility,
    association: {
      ...parsed.association,
      purpose: parsed.purpose,
    },
    generationJobId: parsed.generationJobId,
    replacesAssetId: parsed.replacesAssetId,
    idempotencyKey: parsed.idempotencyKey,
  };
}

function isOwnershipDenial(error: unknown): boolean {
  return error instanceof Error && /(?:not owned by|authenticated owner|owned story)/i.test(error.message);
}

function handleRouteError(error: unknown, res: Response): Response {
  if (error instanceof z.ZodError) {
    return errorResponse(
      res,
      400,
      'invalid_request',
      'The media request is invalid.',
      error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  if (error instanceof MediaInputError) {
    return errorResponse(res, error.code === 'media_too_large' ? 413 : 400, error.code, error.message);
  }
  if (error instanceof MediaAssetServiceError) {
    const statusByCode: Record<string, number> = {
      unauthenticated: 401,
      invalid_metadata: 400,
      delivery_not_configured: 503,
      not_found: 404,
      replacement_not_ready: 404,
      replacement_slot_mismatch: 409,
      current_slot_conflict: 409,
      idempotency_conflict: 409,
      idempotency_in_progress: 409,
      idempotency_failed: 409,
      idempotency_state_conflict: 503,
      asset_not_ready: 409,
      history_asset_not_found: 404,
      media_slot_not_found: 404,
      rate_limit_exceeded: 429,
      user_quota_exceeded: 413,
      public_storage_prohibited: 403,
      quota_reservation_failed: 503,
      database_reservation_failed: 503,
      upload_failed: 502,
      upload_confirmation_failed: 502,
      database_commit_failed: 503,
      delete_pending_cleanup: 503,
    };
    return errorResponse(res, statusByCode[error.code] ?? 500, error.code, error.message, {
      ...(error.assetId ? { assetId: error.assetId } : {}),
      recoverable: error.recoverable,
    });
  }
  if (isOwnershipDenial(error)) {
    return errorResponse(res, 403, 'forbidden', 'The authenticated user does not own the requested media target.');
  }
  logger.error({ err: error }, 'Foundation media asset route failed');
  return errorResponse(res, 500, 'internal_error', 'The media request could not be completed.');
}

function asyncRoute(
  handler: (req: Request, res: Response<unknown, MediaResponseLocals>) => Promise<void>,
) {
  return (req: Request, res: Response<unknown, MediaResponseLocals>, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export function createMediaAssetRouter(
  dependencies: MediaAssetRouteDependencies = defaultDependencies,
): express.Router {
  const router = express.Router();
  const authenticate = authenticateMediaRequest(dependencies);

  router.post(
    '/api/foundation/media-assets',
    authenticate,
    express.json({ limit: JSON_DATA_URL_LIMIT }),
    asyncRoute(async (req, res) => {
      const request = toSaveRequest(jsonMediaRequestSchema.parse(req.body));
      const asset = await (await dependencies.getService()).save(res.locals.mediaOwner, request);
      res.status(201).json({ asset });
    }),
  );

  router.post(
    '/api/foundation/media-assets/upload',
    authenticate,
    express.raw({ type: () => true, limit: RAW_UPLOAD_LIMIT }),
    asyncRoute(async (req, res) => {
      const metadata = rawMediaQuerySchema.parse(req.query);
      if (!Buffer.isBuffer(req.body)) {
        throw new MediaInputError('The upload body must contain raw file bytes.', 'invalid_upload_body');
      }
      const mimeType = req.get('content-type');
      if (!mimeType || mimeType.length > 200) {
        throw new MediaInputError('A valid Content-Type header is required for raw uploads.', 'invalid_content_type');
      }
      const request: SaveMediaAssetRequest = {
        source: {
          kind: 'bytes',
          bytes: new Uint8Array(req.body),
          mimeType,
          filename: metadata.filename,
        },
        assetType: metadata.assetType,
        purpose: metadata.purpose,
        visibility: metadata.visibility,
        association: {
          targetKind: metadata.targetKind,
          targetKey: metadata.targetKey,
          purpose: metadata.purpose,
          storyId: metadata.storyId,
          chapterId: metadata.chapterId,
          entityId: metadata.entityId,
          clientHistoryId: metadata.clientHistoryId,
          legacyMediaId: metadata.legacyMediaId,
          entityType: metadata.entityType,
          promptUsed: metadata.promptUsed,
          chapterNumber: metadata.chapterNumber,
          arcTitle: metadata.arcTitle,
          label: metadata.label,
        },
        generationJobId: metadata.generationJobId,
        replacesAssetId: metadata.replacesAssetId,
        idempotencyKey: metadata.idempotencyKey,
      };
      const asset = await (await dependencies.getService()).save(res.locals.mediaOwner, request);
      res.status(201).json({ asset });
    }),
  );

  router.post(
    '/api/foundation/media-assets/:assetId/select',
    authenticate,
    express.json({ limit: '32kb' }),
    asyncRoute(async (req, res) => {
      const { assetId } = mediaAssetParamsSchema.parse(req.params);
      const { association } = selectMediaAssetSchema.parse(req.body);
      const asset = await (await dependencies.getService()).select(
        res.locals.mediaOwner.uid,
        assetId,
        association,
      );
      res.json({ asset });
    }),
  );

  router.get(
    '/api/foundation/media-assets/:assetId',
    authenticate,
    asyncRoute(async (req, res) => {
      const { assetId } = mediaAssetParamsSchema.parse(req.params);
      const asset = await (await dependencies.getService()).get(res.locals.mediaOwner.uid, assetId);
      if (!asset) {
        errorResponse(res, 404, 'not_found', 'Media asset was not found.');
        return;
      }
      res.json({ asset });
    }),
  );

  router.delete(
    '/api/foundation/media-assets/:assetId',
    authenticate,
    asyncRoute(async (req, res) => {
      const { assetId } = mediaAssetParamsSchema.parse(req.params);
      await (await dependencies.getService()).delete(res.locals.mediaOwner.uid, assetId);
      res.status(204).send();
    }),
  );

  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const parserError = error as { type?: string; status?: number };
    if (parserError.type === 'entity.too.large') {
      errorResponse(res, 413, 'media_too_large', 'The media request body exceeds this endpoint\'s size limit.');
      return;
    }
    if (parserError.type === 'entity.parse.failed') {
      // body-parser errors contain the raw request body. Never pass them to the
      // logger because an invalid data URL could otherwise become durable log data.
      errorResponse(res, 400, 'invalid_json', 'The JSON media request is malformed.');
      return;
    }
    if (parserError.status && parserError.status >= 400 && parserError.status < 500) {
      errorResponse(res, parserError.status, 'invalid_request_body', 'The media request body could not be read.');
      return;
    }
    handleRouteError(error, res);
  });

  return router;
}

export const mediaAssetRouter = createMediaAssetRouter();
