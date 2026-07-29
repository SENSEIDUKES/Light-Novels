import { auth } from '../firebase';
import { generateUUID } from '../id';
import type {
  MediaAssetDescriptor,
  MediaAssetType,
  MediaAssociation,
  MediaVisibility,
} from '../../contracts/mediaAssets';
import { canonicalAssetId } from '../../contracts/assetIdentity';

export const MEDIA_TARGET_KIND = {
  STORY: 'STORY',
  CHAPTER: 'CHAPTER',
  CHARACTER: 'CHARACTER',
  BEAST: 'BEAST',
  LOCATION: 'LOCATION',
  ARTIFACT: 'ARTIFACT',
  FACTION: 'FACTION',
  PORTRAIT: 'PORTRAIT',
} as const;

export const MEDIA_PURPOSE = {
  STORY_COVER: 'STORY_COVER',
  MANIFESTATION: 'MANIFESTATION',
  CHAPTER_HERO: 'CHAPTER_HERO',
  CELESTIAL_PORTRAIT: 'CELESTIAL_PORTRAIT',
  VOICE_CARD: 'VOICE_CARD',
} as const;

export interface SaveBrowserMediaInput {
  source: string | Blob;
  assetType: MediaAssetType;
  purpose: string;
  association: Omit<MediaAssociation, 'purpose'>;
  visibility?: MediaVisibility;
  filename?: string;
  expectedMimeType?: string;
  generationJobId?: string | null;
  replacesAssetId?: string | null;
  idempotencyKey?: string;
  /** Abort publication if authentication changes while the upload is in flight. */
  expectedOwnerUid?: string;
}

export class MediaAssetClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly recoverable: boolean;
  readonly assetId?: string;

  constructor(
    message: string,
    options: { code?: string; status?: number; recoverable?: boolean; assetId?: string } = {},
  ) {
    super(message);
    this.name = 'MediaAssetClientError';
    this.code = options.code ?? 'media_request_failed';
    this.status = options.status ?? 0;
    this.recoverable = options.recoverable ?? (this.status >= 500 || this.status === 0);
    this.assetId = options.assetId;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Resolve canonical SQL UUIDs while accepting the disposable phase-one prefix. */
export function requirePersistenceUuid(value: string | undefined, label: string): string {
  const normalized = value?.trim() ?? '';
  const canonical = canonicalAssetId(normalized);
  if (UUID_PATTERN.test(canonical)) return canonical;
  const prefixed = normalized.match(/^(?:story|seed)-([0-9a-f-]{36})$/i)?.[1];
  if (prefixed) {
    const canonicalPrefixed = canonicalAssetId(prefixed);
    if (UUID_PATTERN.test(canonicalPrefixed)) return canonicalPrefixed;
  }
  throw new MediaAssetClientError(
    `${label} has not synchronized with PostgreSQL yet. Retry after synchronization completes.`,
    { code: 'persistence_identity_missing', status: 409, recoverable: true },
  );
}

function assertExpectedOwner(expectedOwnerUid?: string): void {
  if (expectedOwnerUid && auth.currentUser?.uid !== expectedOwnerUid) {
    throw new MediaAssetClientError('The active account changed during media persistence.', {
      code: 'auth/account-changed',
      status: 409,
      recoverable: false,
    });
  }
}

async function authHeaders(
  contentType?: string,
  expectedOwnerUid?: string,
): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new MediaAssetClientError('Sign in before saving permanent media.', {
      code: 'unauthenticated',
      status: 401,
      recoverable: false,
    });
  }
  assertExpectedOwner(expectedOwnerUid);
  const ownerUid = user.uid;
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== ownerUid) {
    throw new MediaAssetClientError('The active account changed during media persistence.', {
      code: 'auth/account-changed',
      status: 409,
      recoverable: false,
    });
  }
  return {
    Authorization: `Bearer ${token}`,
    ...(contentType ? { 'Content-Type': contentType } : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
  let payload: any;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  const error = payload?.error;
  throw new MediaAssetClientError(
    typeof error?.message === 'string' ? error.message : 'Permanent media storage failed.',
    {
      code: typeof error?.code === 'string' ? error.code : 'media_request_failed',
      status: response.status,
      recoverable: Boolean(error?.details?.recoverable ?? response.status >= 500),
      assetId: typeof error?.details?.assetId === 'string' ? error.details.assetId : undefined,
    },
  );
}

function jsonSource(source: string, filename?: string, expectedMimeType?: string) {
  if (source.startsWith('data:')) {
    return { kind: 'data-url' as const, dataUrl: source, filename };
  }
  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch (error) {
    throw new MediaAssetClientError('Generated media source is not a valid data or HTTPS URL.', {
      code: 'invalid_media_source',
      status: 400,
      recoverable: false,
    });
  }
  if (parsed.protocol !== 'https:') {
    throw new MediaAssetClientError('Permanent remote media sources must use HTTPS.', {
      code: 'invalid_media_source',
      status: 400,
      recoverable: false,
    });
  }
  return {
    kind: 'remote-url' as const,
    url: parsed.toString(),
    filename,
    expectedMimeType,
  };
}

function canonicalDescriptor(descriptor: MediaAssetDescriptor): MediaAssetDescriptor {
  const id = canonicalAssetId(descriptor.id);
  return id === descriptor.id ? descriptor : { ...descriptor, id };
}

function canonicalAssociation<T extends Omit<MediaAssociation, 'purpose'> | MediaAssociation>(
  association: T,
): T {
  const relationalTarget = Boolean(
    association.storyId || association.chapterId || association.entityId,
  );
  return {
    ...association,
    // Account target keys are Firebase UIDs, not PostgreSQL UUIDs. A custom
    // UID may happen to be 32 hex characters and must never be hyphenated.
    targetKey: relationalTarget
      ? canonicalAssetId(association.targetKey)
      : association.targetKey.trim(),
    ...(association.storyId
      ? { storyId: canonicalAssetId(association.storyId) }
      : {}),
    ...(association.chapterId
      ? { chapterId: canonicalAssetId(association.chapterId) }
      : {}),
    ...(association.entityId
      ? { entityId: canonicalAssetId(association.entityId) }
      : {}),
  };
}

export async function saveMediaAsset(input: SaveBrowserMediaInput): Promise<MediaAssetDescriptor> {
  const idempotencyKey = input.idempotencyKey ?? generateUUID();
  const association = canonicalAssociation(input.association);
  const generationJobId = input.generationJobId
    ? canonicalAssetId(input.generationJobId)
    : input.generationJobId;
  const replacesAssetId = input.replacesAssetId
    ? canonicalAssetId(input.replacesAssetId)
    : input.replacesAssetId;
  if (input.source instanceof Blob) {
    const query = new URLSearchParams({
      assetType: input.assetType,
      purpose: input.purpose,
      targetKind: association.targetKind,
      targetKey: association.targetKey,
      idempotencyKey,
      ...(input.visibility ? { visibility: input.visibility } : {}),
      ...(association.storyId ? { storyId: association.storyId } : {}),
      ...(association.chapterId ? { chapterId: association.chapterId } : {}),
      ...(association.entityId ? { entityId: association.entityId } : {}),
      ...(generationJobId ? { generationJobId } : {}),
      ...(replacesAssetId ? { replacesAssetId } : {}),
      ...(input.filename ? { filename: input.filename } : {}),
    });
    const response = await fetch(`/api/foundation/media-assets/upload?${query}`, {
      method: 'POST',
      headers: await authHeaders(
        input.source.type || 'application/octet-stream',
        input.expectedOwnerUid,
      ),
      body: input.source,
    });
    const asset = (await parseResponse<{ asset: MediaAssetDescriptor }>(response)).asset;
    assertExpectedOwner(input.expectedOwnerUid);
    return canonicalDescriptor(asset);
  }

  const response = await fetch('/api/foundation/media-assets', {
    method: 'POST',
    headers: await authHeaders('application/json', input.expectedOwnerUid),
    body: JSON.stringify({
      source: jsonSource(input.source, input.filename, input.expectedMimeType),
      assetType: input.assetType,
      purpose: input.purpose,
      visibility: input.visibility,
      association: { ...association, purpose: input.purpose },
      generationJobId,
      replacesAssetId,
      idempotencyKey,
    }),
  });
  const asset = (await parseResponse<{ asset: MediaAssetDescriptor }>(response)).asset;
  assertExpectedOwner(input.expectedOwnerUid);
  return canonicalDescriptor(asset);
}

export async function getMediaAsset(
  assetId: string,
  expectedOwnerUid?: string,
): Promise<MediaAssetDescriptor> {
  const canonicalId = canonicalAssetId(assetId);
  const response = await fetch(`/api/foundation/media-assets/${encodeURIComponent(canonicalId)}`, {
    headers: await authHeaders(undefined, expectedOwnerUid),
  });
  const asset = (await parseResponse<{ asset: MediaAssetDescriptor }>(response)).asset;
  assertExpectedOwner(expectedOwnerUid);
  return canonicalDescriptor(asset);
}

export async function selectMediaAsset(
  assetId: string,
  association: MediaAssociation,
  expectedOwnerUid?: string,
): Promise<MediaAssetDescriptor> {
  const canonicalId = canonicalAssetId(assetId);
  const normalizedAssociation = canonicalAssociation(association);
  const response = await fetch(
    `/api/foundation/media-assets/${encodeURIComponent(canonicalId)}/select`,
    {
      method: 'POST',
      headers: await authHeaders('application/json', expectedOwnerUid),
      body: JSON.stringify({ association: normalizedAssociation }),
    },
  );
  const asset = (await parseResponse<{ asset: MediaAssetDescriptor }>(response)).asset;
  assertExpectedOwner(expectedOwnerUid);
  return canonicalDescriptor(asset);
}

export async function deleteMediaAsset(assetId: string): Promise<void> {
  const canonicalId = canonicalAssetId(assetId);
  const response = await fetch(`/api/foundation/media-assets/${encodeURIComponent(canonicalId)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  await parseResponse<void>(response);
}
