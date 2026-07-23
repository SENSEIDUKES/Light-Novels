import type { ChapterContent, LoreGlossary, StoryWorld } from '../../types';
import type { CloudRevisionExpectation, StorageAdapter } from './types';

const DEFAULT_BASE_URL = '/api/persistence';
const MIN_SUSPICIOUS_BASE64_LENGTH = 1024;
const BASE64_ONLY = /^[A-Za-z0-9+/]+={0,2}$/;
const EMBEDDED_MEDIA_PREFIX = /^\s*(?:data:[^;,]+;base64,|blob:)/i;
const MEDIA_BASE64_MAGIC = /^(?:iVBORw0KGgo|\/9j\/|R0lGOD|UklGR|SUQz|T2dnUw|JVBERi0|AAAA[A-Za-z0-9+/]{0,24}ZXR5c)/;
const DEFAULT_TEMPORARY_MEDIA_HOSTS = [
  'image.pollinations.ai',
  'replicate.delivery',
  'fal.media',
  'oaidalleapiprodscus.blob.core.windows.net',
] as const;

type JsonRecord = Record<string, unknown>;

export interface PersistenceAuthUser {
  readonly uid: string;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

/** Minimal Firebase Auth surface required by the persistence client. */
export interface PersistenceAuth {
  readonly currentUser: PersistenceAuthUser | null;
}

export interface DataConnectStorageAdapterOptions {
  auth: PersistenceAuth;
  fetch?: typeof globalThis.fetch;
  baseUrl?: string;
  /** Additional provider hosts whose URLs are previews, not permanent assets. */
  temporaryMediaHosts?: readonly string[];
}

export class DataConnectStorageError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'DataConnectStorageError';
  }
}

export class PermanentPersistencePayloadError extends DataConnectStorageError {
  constructor(message: string, readonly path: string) {
    super(`${message} at ${path}`, 'persistence/permanent-media-payload');
    this.name = 'PermanentPersistencePayloadError';
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasCanonicalAssetId(value: JsonRecord, key: string): boolean {
  return typeof value[key] === 'string' && value[key].trim().length > 0;
}

function stripCanonicalDeliveryUrls(
  value: unknown,
  seen: WeakMap<object, unknown>,
): unknown {
  if (value === null || typeof value !== 'object' || isBinaryValue(value)) return value;
  const cached = seen.get(value);
  if (cached !== undefined) return cached;

  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    value.forEach((entry) => copy.push(stripCanonicalDeliveryUrls(entry, seen)));
    return copy;
  }

  const source = value as JsonRecord;
  const copy: JsonRecord = {};
  seen.set(value, copy);
  for (const [key, entry] of Object.entries(source)) {
    copy[key] = stripCanonicalDeliveryUrls(entry, seen);
  }

  if (
    hasCanonicalAssetId(source, 'coverAssetId') ||
    hasCanonicalAssetId(source, 'imageAssetId') ||
    hasCanonicalAssetId(source, 'assetId')
  ) {
    delete copy.imageUrl;
  }
  if (hasCanonicalAssetId(source, 'voiceAssetId')) {
    delete copy.voiceClipUrl;
  }
  if (hasCanonicalAssetId(source, 'heroImageAssetId') && isRecord(copy.assetManifest)) {
    const assetManifest = { ...copy.assetManifest };
    delete assetManifest.heroImage;
    copy.assetManifest = assetManifest;
  }

  return copy;
}

function isBinaryValue(value: unknown): boolean {
  return (
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  );
}

function isCanonicalBase64(value: string): boolean {
  if (value.length < 12 || !BASE64_ONLY.test(value)) return false;
  const unpadded = value.replace(/=+$/, '');
  return unpadded.length % 4 !== 1;
}

function hostMatches(hostname: string, configuredHost: string): boolean {
  const normalizedHost = configuredHost.trim().toLowerCase().replace(/^\.+/, '');
  return (
    normalizedHost.length > 0 &&
    (hostname === normalizedHost || hostname.endsWith(`.${normalizedHost}`))
  );
}

function isTemporaryProviderUrl(value: string, temporaryMediaHosts: readonly string[]): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    if (temporaryMediaHosts.some((host) => hostMatches(hostname, host))) return true;

    // Signed delivery links expire and therefore cannot be durable media references,
    // even when the provider uses a host that is not in the known-provider list.
    const queryKeys = new Set(Array.from(url.searchParams.keys(), (key) => key.toLowerCase()));
    return (
      queryKeys.has('x-amz-signature') ||
      queryKeys.has('x-goog-signature') ||
      queryKeys.has('googleaccessid') ||
      (queryKeys.has('signature') && (queryKeys.has('expires') || queryKeys.has('policy')))
    );
  } catch {
    return false;
  }
}

function inspectPermanentPayload(
  value: unknown,
  path: string,
  seen: WeakSet<object>,
  temporaryMediaHosts: readonly string[],
): void {
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return;

  if (typeof value === 'string') {
    const compact = value.replace(/\s/g, '');
    if (EMBEDDED_MEDIA_PREFIX.test(value)) {
      throw new PermanentPersistencePayloadError(
        'Embedded data/blob URLs are not permanent metadata',
        path,
      );
    }
    if (
      isCanonicalBase64(compact) &&
      (MEDIA_BASE64_MAGIC.test(compact) || compact.length >= MIN_SUSPICIOUS_BASE64_LENGTH)
    ) {
      throw new PermanentPersistencePayloadError('Raw base64 media is not permanent metadata', path);
    }
    if (isTemporaryProviderUrl(value.trim(), temporaryMediaHosts)) {
      throw new PermanentPersistencePayloadError(
        'Temporary provider URLs are not permanent metadata',
        path,
      );
    }
    return;
  }

  if (isBinaryValue(value)) {
    throw new PermanentPersistencePayloadError('Binary media is not permanent metadata', path);
  }

  if (typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      inspectPermanentPayload(entry, `${path}[${index}]`, seen, temporaryMediaHosts);
    });
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    inspectPermanentPayload(entry, `${path}.${key}`, seen, temporaryMediaHosts);
  }
}

/** Reject file bodies and temporary previews before they can reach PostgreSQL. */
export function assertPermanentPersistencePayload(
  value: unknown,
  temporaryMediaHosts: readonly string[] = DEFAULT_TEMPORARY_MEDIA_HOSTS,
): void {
  inspectPermanentPayload(value, '$', new WeakSet<object>(), temporaryMediaHosts);
}

/**
 * Copy a cloud DTO, removing only delivery fields backed by a canonical R2
 * asset id, then enforce that no other temporary media escaped.
 */
export function preparePermanentPersistencePayload<T>(
  value: T,
  temporaryMediaHosts: readonly string[] = DEFAULT_TEMPORARY_MEDIA_HOSTS,
): T {
  const prepared = stripCanonicalDeliveryUrls(value, new WeakMap<object, unknown>()) as T;
  assertPermanentPersistencePayload(prepared, temporaryMediaHosts);
  return prepared;
}

async function createMutationKey(
  ownerUid: string,
  method: string,
  path: string,
  body: BodyInit | null | undefined,
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new DataConnectStorageError(
      'Secure hashing is required for persistence idempotency',
      'persistence/crypto-unavailable',
    );
  }
  const canonicalBody = typeof body === 'string' ? body : '';
  const bytes = new TextEncoder().encode(
    JSON.stringify({ version: 1, ownerUid, method, path, body: canonicalBody }),
  );
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function requireEnvelope(payload: unknown, key: string): unknown {
  if (!isRecord(payload) || !(key in payload)) {
    throw new DataConnectStorageError(
      `Persistence response is missing the ${key} field`,
      'persistence/invalid-response',
    );
  }
  return payload[key];
}

function requireStory(value: unknown): StoryWorld {
  if (!isRecord(value) || typeof value.id !== 'string') {
    throw new DataConnectStorageError(
      'Persistence response contains an invalid story',
      'persistence/invalid-response',
    );
  }
  return value as unknown as StoryWorld;
}

function requireChapter(value: unknown): ChapterContent {
  if (
    !isRecord(value) ||
    typeof value.storyId !== 'string' ||
    typeof value.chapterNumber !== 'number'
  ) {
    throw new DataConnectStorageError(
      'Persistence response contains invalid chapter content',
      'persistence/invalid-response',
    );
  }
  return value as unknown as ChapterContent;
}

function requireGlossaryTerm(value: unknown): LoreGlossary {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.novel_id !== 'string'
  ) {
    throw new DataConnectStorageError(
      'Persistence response contains an invalid glossary term',
      'persistence/invalid-response',
    );
  }
  return value as unknown as LoreGlossary;
}

function responseMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    if (typeof payload.error === 'string' && payload.error) return payload.error;
    if (typeof payload.message === 'string' && payload.message) return payload.message;
  }
  return fallback;
}

/**
 * Authenticated browser adapter for the trusted Data Connect persistence routes.
 * It deliberately depends on only the Firebase Auth shape, never Firestore.
 */
export class DataConnectStorageAdapter implements StorageAdapter {
  readonly name = 'Data Connect (PostgreSQL)';

  private readonly auth: PersistenceAuth;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly baseUrl: string;
  private readonly temporaryMediaHosts: readonly string[];

  constructor(options: DataConnectStorageAdapterOptions) {
    this.auth = options.auth;
    const providedFetch = options.fetch;
    if (!providedFetch && typeof globalThis.fetch !== 'function') {
      throw new DataConnectStorageError(
        'The persistence adapter requires the Fetch API',
        'persistence/fetch-unavailable',
      );
    }
    this.fetchImpl = providedFetch ?? ((input, init) => globalThis.fetch(input, init));
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.temporaryMediaHosts = [
      ...DEFAULT_TEMPORARY_MEDIA_HOSTS,
      ...(options.temporaryMediaHosts ?? []),
    ];
  }

  async init(): Promise<void> {
    return Promise.resolve();
  }

  async getStories(): Promise<StoryWorld[]> {
    const payload = await this.request('/stories');
    const stories = requireEnvelope(payload, 'stories');
    if (!Array.isArray(stories)) {
      throw new DataConnectStorageError(
        'Persistence response contains an invalid stories list',
        'persistence/invalid-response',
      );
    }
    return stories.map(requireStory);
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    const payload = await this.request(`/stories/${encodeURIComponent(id)}`);
    const story = requireEnvelope(payload, 'story');
    return story === null ? null : requireStory(story);
  }

  async saveStory(story: StoryWorld): Promise<void> {
    await this.putStory(story);
  }

  async saveStoryIfUnchanged(
    story: StoryWorld,
    expected: CloudRevisionExpectation,
  ): Promise<void> {
    await this.putStory(story, expected);
  }

  async deleteStory(id: string): Promise<void> {
    await this.request(`/stories/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async getChapterContent(
    storyId: string,
    chapterNumber: number,
  ): Promise<ChapterContent | null> {
    const payload = await this.request(this.chapterPath(storyId, chapterNumber));
    const content = requireEnvelope(payload, 'content');
    return content === null ? null : requireChapter(content);
  }

  async saveChapterContent(content: ChapterContent): Promise<void> {
    await this.putChapter(content);
  }

  async saveChapterContentIfUnchanged(
    content: ChapterContent,
    expected: CloudRevisionExpectation,
  ): Promise<void> {
    await this.putChapter(content, expected);
  }

  async getLoreGlossary(storyId: string): Promise<LoreGlossary[]> {
    const payload = await this.request(`/stories/${encodeURIComponent(storyId)}/glossary`);
    const terms = requireEnvelope(payload, 'terms');
    if (!Array.isArray(terms)) {
      throw new DataConnectStorageError(
        'Persistence response contains an invalid glossary list',
        'persistence/invalid-response',
      );
    }
    return terms.map(requireGlossaryTerm);
  }

  async saveLoreGlossaryTerm(term: LoreGlossary): Promise<void> {
    const persistedTerm = preparePermanentPersistencePayload(term, this.temporaryMediaHosts);
    await this.request(`/stories/${encodeURIComponent(term.novel_id)}/glossary`, {
      method: 'POST',
      body: JSON.stringify({ term: persistedTerm }),
    });
  }

  async saveLoreGlossaryTerms(storyId: string, terms: readonly LoreGlossary[]): Promise<void> {
    const persistedTerms = preparePermanentPersistencePayload(terms, this.temporaryMediaHosts);
    await this.request(`/stories/${encodeURIComponent(storyId)}/glossary/batch`, {
      method: 'POST',
      body: JSON.stringify({ terms: persistedTerms }),
    });
  }

  async deleteLoreGlossaryTerm(termId: string): Promise<void> {
    await this.request(`/glossary/${encodeURIComponent(termId)}`, { method: 'DELETE' });
  }

  private async putStory(
    story: StoryWorld,
    expected?: CloudRevisionExpectation,
  ): Promise<void> {
    const persistedStory = preparePermanentPersistencePayload(story, this.temporaryMediaHosts);
    await this.request(`/stories/${encodeURIComponent(story.id)}`, {
      method: 'PUT',
      body: JSON.stringify(
        expected === undefined
          ? { story: persistedStory }
          : { story: persistedStory, expected },
      ),
    });
  }

  private async putChapter(
    content: ChapterContent,
    expected?: CloudRevisionExpectation,
  ): Promise<void> {
    const persistedContent = preparePermanentPersistencePayload(content, this.temporaryMediaHosts);
    await this.request(this.chapterPath(content.storyId, content.chapterNumber), {
      method: 'PUT',
      body: JSON.stringify(
        expected === undefined
          ? { content: persistedContent }
          : { content: persistedContent, expected },
      ),
    });
  }

  private chapterPath(storyId: string, chapterNumber: number): string {
    if (!Number.isSafeInteger(chapterNumber)) {
      throw new DataConnectStorageError(
        'Chapter number must be a safe integer',
        'persistence/invalid-argument',
      );
    }
    return `/stories/${encodeURIComponent(storyId)}/chapters/${chapterNumber}`;
  }

  private assertAccount(expectedUid: string): void {
    if (this.auth.currentUser?.uid === expectedUid) return;
    throw new DataConnectStorageError(
      'Cloud account changed during persistence operation',
      'auth/account-changed',
    );
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new DataConnectStorageError(
        'Authentication is required for cloud persistence',
        'auth/unauthenticated',
      );
    }

    const expectedUid = user.uid;
    let token: string;
    try {
      token = await user.getIdToken();
    } catch (error) {
      this.assertAccount(expectedUid);
      throw error;
    }
    this.assertAccount(expectedUid);

    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const method = (init.method ?? 'GET').toUpperCase();
    if (method === 'PUT' || method === 'POST' || method === 'DELETE') {
      headers.set(
        'Idempotency-Key',
        await createMutationKey(expectedUid, method, path, init.body),
      );
      this.assertAccount(expectedUid);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers });
    } catch (error) {
      this.assertAccount(expectedUid);
      const networkError = new DataConnectStorageError(
        error instanceof Error ? error.message : 'Persistence request failed',
        'persistence/network-error',
      );
      (networkError as DataConnectStorageError & { cause?: unknown }).cause = error;
      throw networkError;
    }
    this.assertAccount(expectedUid);

    const rawBody = response.status === 204 ? '' : await response.text();
    this.assertAccount(expectedUid);

    let payload: unknown;
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody) as unknown;
      } catch {
        if (response.ok) {
          throw new DataConnectStorageError(
            'Persistence endpoint returned invalid JSON',
            'persistence/invalid-response',
            response.status,
          );
        }
        payload = undefined;
      }
    }

    if (response.status === 409) {
      throw new DataConnectStorageError(
        responseMessage(payload, 'Cloud record changed after synchronization read'),
        'sync/revision-changed',
        response.status,
      );
    }
    if (!response.ok) {
      throw new DataConnectStorageError(
        responseMessage(payload, `Persistence request failed with HTTP ${response.status}`),
        'persistence/http-error',
        response.status,
      );
    }

    return payload;
  }
}
