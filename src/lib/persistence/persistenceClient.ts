import { auth } from '../firebase';
import { generateUUID } from '../id';
import type { LoreGlossary, StorySeed, UserProfile } from '../../types';

export class PersistenceClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly recoverable: boolean;
  readonly details?: unknown;

  constructor(
    message: string,
    options: {
      code?: string;
      status?: number;
      recoverable?: boolean;
      details?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'PersistenceClientError';
    this.code = options.code ?? 'persistence_request_failed';
    this.status = options.status ?? 0;
    this.recoverable = options.recoverable ?? (this.status === 0 || this.status >= 500);
    this.details = options.details;
  }
}

interface PersistenceErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export interface PersistenceMutationOptions {
  expectedSyncRevision?: string | null;
  idempotencyKey?: string;
}

function accountChangedError(): PersistenceClientError {
  return new PersistenceClientError('The active account changed during persistence.', {
    code: 'auth/account-changed',
    status: 409,
    recoverable: true,
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  let payload: PersistenceErrorPayload | undefined;
  try {
    payload = (await response.json()) as PersistenceErrorPayload;
  } catch {
    payload = undefined;
  }
  const code = payload?.error?.code ?? 'persistence_request_failed';
  throw new PersistenceClientError(
    payload?.error?.message ?? 'The Celestial Library could not persist this change.',
    {
      code,
      status: response.status,
      recoverable:
        code === 'revision_conflict'
        || code === 'database_commit_unknown'
        || response.status === 408
        || response.status === 409
        || response.status >= 500,
      details: payload?.error?.details,
    },
  );
}

export async function persistenceRequest<T>(
  path: string,
  init: RequestInit = {},
  expectedUid?: string,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new PersistenceClientError('Sign in to access the Celestial Library.', {
      code: 'unauthenticated',
      status: 401,
      recoverable: false,
    });
  }
  if (expectedUid && user.uid !== expectedUid) throw accountChangedError();
  const ownerUid = user.uid;
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== ownerUid) throw accountChangedError();

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`/api/persistence${path}`, { ...init, headers });
  if (auth.currentUser?.uid !== ownerUid) throw accountChangedError();
  return parseResponse<T>(response);
}

function mutationBody<T>(value: T, options: PersistenceMutationOptions = {}) {
  return JSON.stringify({
    value,
    expectedSyncRevision: options.expectedSyncRevision,
    idempotencyKey: options.idempotencyKey ?? generateUUID(),
  });
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const result = await persistenceRequest<{ profile: UserProfile | null }>('/profile');
  return result.profile;
}

export async function saveUserProfile(
  value: Partial<UserProfile>,
  options: PersistenceMutationOptions = {},
): Promise<UserProfile> {
  const result = await persistenceRequest<{ profile: UserProfile }>('/profile', {
    method: 'PUT',
    body: mutationBody(value, options),
  }, typeof value.uid === 'string' ? value.uid : undefined);
  return result.profile;
}

export async function consumeImageGenerationQuota(): Promise<{
  imageGenerationCount: number;
  imageQuotaResetAt: string;
}> {
  return persistenceRequest('/profile/image-quota/consume', {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey: generateUUID() }),
  });
}

export async function listStorySeeds(): Promise<StorySeed[]> {
  const result = await persistenceRequest<{ seeds: StorySeed[] }>('/seeds');
  return result.seeds;
}

export async function getStorySeed(seedId: string): Promise<StorySeed | null> {
  const result = await persistenceRequest<{ seed: StorySeed | null }>(
    `/seeds/${encodeURIComponent(seedId)}`,
  );
  return result.seed;
}

export async function saveStorySeed(
  seed: StorySeed,
  options: PersistenceMutationOptions = {},
): Promise<StorySeed> {
  const result = await persistenceRequest<{ seed: StorySeed }>(
    `/seeds/${encodeURIComponent(seed.id)}`,
    {
      method: 'PUT',
      body: mutationBody(seed, options),
    },
    seed.userId,
  );
  return result.seed;
}

export async function saveStorySeeds(
  seeds: StorySeed[],
  idempotencyKey = generateUUID(),
): Promise<StorySeed[]> {
  const result = await persistenceRequest<{ seeds: StorySeed[] }>('/seeds/batch', {
    method: 'POST',
    body: JSON.stringify({ seeds, idempotencyKey }),
  }, seeds[0]?.userId);
  return result.seeds;
}

export async function deleteStorySeed(seedId: string): Promise<void> {
  await persistenceRequest<void>(`/seeds/${encodeURIComponent(seedId)}`, {
    method: 'DELETE',
    headers: { 'Idempotency-Key': generateUUID() },
  });
}

export async function getLoreGlossary(storyId: string): Promise<LoreGlossary[]> {
  const result = await persistenceRequest<{ terms: LoreGlossary[] }>(
    `/stories/${encodeURIComponent(storyId)}/glossary`,
  );
  return result.terms;
}

export async function saveLoreGlossaryTerm(
  term: Omit<LoreGlossary, 'id'> & { id?: string },
): Promise<LoreGlossary> {
  const result = await persistenceRequest<{ term: LoreGlossary }>(
    `/stories/${encodeURIComponent(term.novel_id)}/glossary`,
    {
      method: 'POST',
      body: JSON.stringify({ term, idempotencyKey: generateUUID() }),
    },
  );
  return result.term;
}

export async function deleteLoreGlossaryTerm(termId: string): Promise<void> {
  await persistenceRequest<void>(`/glossary/${encodeURIComponent(termId)}`, {
    method: 'DELETE',
    headers: { 'Idempotency-Key': generateUUID() },
  });
}

export interface AdminAccountSummary {
  profile: UserProfile;
}

export interface AdminStorySummary {
  id: string;
  ownerUid: string;
  title: string;
  deleted?: boolean;
  updatedAt: string;
}

export async function getPersistenceAdminOverview(): Promise<{
  users: UserProfile[];
  stories: AdminStorySummary[];
}> {
  return persistenceRequest('/admin/overview');
}

export async function updatePersistenceAdminAccount(
  ownerUid: string,
  patch: Pick<UserProfile, 'role' | 'premiumTier'>,
): Promise<UserProfile> {
  const result = await persistenceRequest<{ profile: UserProfile }>(
    `/admin/accounts/${encodeURIComponent(ownerUid)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ patch, idempotencyKey: generateUUID() }),
    },
  );
  return result.profile;
}

export async function deletePersistenceAdminStory(storyId: string): Promise<void> {
  await persistenceRequest<void>(`/admin/stories/${encodeURIComponent(storyId)}`, {
    method: 'DELETE',
    headers: { 'Idempotency-Key': generateUUID() },
  });
}
