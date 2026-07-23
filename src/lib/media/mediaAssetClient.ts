import { auth } from '../firebase';
import { generateUUID } from '../id';
import type {
  MediaAssetDescriptor,
  MediaAssetType,
  MediaAssociation,
  MediaVisibility,
} from '../../contracts/mediaAssets';

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
  if (UUID_PATTERN.test(normalized)) return normalized;
  const prefixed = normalized.match(/^(?:story|seed)-([0-9a-f-]{36})$/i)?.[1];
  if (prefixed && UUID_PATTERN.test(prefixed)) return prefixed;
  throw new MediaAssetClientError(
    `${label} has not synchronized with PostgreSQL yet. Retry after synchronization completes.`,
    { code: 'persistence_identity_missing', status: 409, recoverable: true },
  );
}

async function authHeaders(contentType?: string): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new MediaAssetClientError('Sign in before saving permanent media.', {
      code: 'unauthenticated',
      status: 401,
      recoverable: false,
    });
  }
  const token = await user.getIdToken();
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

export async function saveMediaAsset(input: SaveBrowserMediaInput): Promise<MediaAssetDescriptor> {
  const idempotencyKey = input.idempotencyKey ?? generateUUID();
  if (input.source instanceof Blob) {
    const query = new URLSearchParams({
      assetType: input.assetType,
      purpose: input.purpose,
      targetKind: input.association.targetKind,
      targetKey: input.association.targetKey,
      idempotencyKey,
      ...(input.visibility ? { visibility: input.visibility } : {}),
      ...(input.association.storyId ? { storyId: input.association.storyId } : {}),
      ...(input.association.chapterId ? { chapterId: input.association.chapterId } : {}),
      ...(input.association.entityId ? { entityId: input.association.entityId } : {}),
      ...(input.generationJobId ? { generationJobId: input.generationJobId } : {}),
      ...(input.replacesAssetId ? { replacesAssetId: input.replacesAssetId } : {}),
      ...(input.filename ? { filename: input.filename } : {}),
    });
    const response = await fetch(`/api/foundation/media-assets/upload?${query}`, {
      method: 'POST',
      headers: await authHeaders(input.source.type || 'application/octet-stream'),
      body: input.source,
    });
    return (await parseResponse<{ asset: MediaAssetDescriptor }>(response)).asset;
  }

  const response = await fetch('/api/foundation/media-assets', {
    method: 'POST',
    headers: await authHeaders('application/json'),
    body: JSON.stringify({
      source: jsonSource(input.source, input.filename, input.expectedMimeType),
      assetType: input.assetType,
      purpose: input.purpose,
      visibility: input.visibility,
      association: { ...input.association, purpose: input.purpose },
      generationJobId: input.generationJobId,
      replacesAssetId: input.replacesAssetId,
      idempotencyKey,
    }),
  });
  return (await parseResponse<{ asset: MediaAssetDescriptor }>(response)).asset;
}

export async function getMediaAsset(assetId: string): Promise<MediaAssetDescriptor> {
  const response = await fetch(`/api/foundation/media-assets/${encodeURIComponent(assetId)}`, {
    headers: await authHeaders(),
  });
  return (await parseResponse<{ asset: MediaAssetDescriptor }>(response)).asset;
}

export async function selectMediaAsset(
  assetId: string,
  association: MediaAssociation,
): Promise<MediaAssetDescriptor> {
  const response = await fetch(
    `/api/foundation/media-assets/${encodeURIComponent(assetId)}/select`,
    {
      method: 'POST',
      headers: await authHeaders('application/json'),
      body: JSON.stringify({ association }),
    },
  );
  return (await parseResponse<{ asset: MediaAssetDescriptor }>(response)).asset;
}

export async function deleteMediaAsset(assetId: string): Promise<void> {
  const response = await fetch(`/api/foundation/media-assets/${encodeURIComponent(assetId)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  await parseResponse<void>(response);
}
