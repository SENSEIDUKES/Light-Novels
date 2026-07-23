import type { MediaAssetDescriptor } from "../../contracts/mediaAssets";
import { auth } from "../firebase";
import { IndexedDbFoundationCache } from "../foundation/cache/indexedDbFoundationCache";
import type { FoundationCache } from "../foundation/cache/types";
import { getMediaAsset } from "./mediaAssetClient";

const REFRESH_SKEW_MS = 60_000;
const MEDIA_BLOB_TTL_MS = 24 * 60 * 60 * 1000;

export interface ResolvedPrivateMedia {
  assetId: string;
  descriptor: MediaAssetDescriptor;
  url: string;
  source: "indexeddb" | "network" | "public" | "direct";
}

export interface PrivateMediaResolverOptions {
  ownerUid: string;
  cache: FoundationCache;
  getDescriptor?: (assetId: string) => Promise<MediaAssetDescriptor>;
  fetch?: typeof globalThis.fetch;
  isOnline?: () => boolean;
  now?: () => number;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
}

function identity(descriptor: MediaAssetDescriptor) {
  return {
    assetVersion: String(descriptor.version),
    checksum: descriptor.checksumSha256.toLowerCase(),
  };
}

function isNearlyExpired(descriptor: MediaAssetDescriptor, now: number): boolean {
  if (descriptor.visibility !== "PRIVATE") return false;
  const expiresAt = descriptor.deliveryUrlExpiresAt
    ? Date.parse(descriptor.deliveryUrlExpiresAt)
    : Number.NaN;
  return !Number.isFinite(expiresAt) || expiresAt <= now + REFRESH_SKEW_MS;
}

async function verifyChecksum(blob: Blob, expected: string): Promise<void> {
  const normalized = expected.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized) || !globalThis.crypto?.subtle) return;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const actual = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0")).join("");
  if (actual !== normalized) {
    throw new Error("Private media checksum did not match its PostgreSQL descriptor.");
  }
}

export class PrivateMediaResolver {
  readonly ownerUid: string;
  private readonly cache: FoundationCache;
  private readonly getDescriptor: (assetId: string) => Promise<MediaAssetDescriptor>;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly isOnline: () => boolean;
  private readonly now: () => number;
  private readonly createObjectUrl: (blob: Blob) => string;
  private readonly revokeObjectUrl: (url: string) => void;
  private readonly objectUrls = new Map<string, string>();

  constructor(options: PrivateMediaResolverOptions) {
    this.ownerUid = options.ownerUid;
    this.cache = options.cache;
    this.getDescriptor = options.getDescriptor ?? getMediaAsset;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.isOnline = options.isOnline
      ?? (() => typeof navigator === "undefined" || navigator.onLine);
    this.now = options.now ?? Date.now;
    this.createObjectUrl = options.createObjectUrl ?? URL.createObjectURL.bind(URL);
    this.revokeObjectUrl = options.revokeObjectUrl ?? URL.revokeObjectURL.bind(URL);
  }

  private objectUrl(assetId: string, blob: Blob): string {
    const previous = this.objectUrls.get(assetId);
    if (previous) this.revokeObjectUrl(previous);
    const url = this.createObjectUrl(blob);
    this.objectUrls.set(assetId, url);
    return url;
  }

  async resolve(input: MediaAssetDescriptor): Promise<ResolvedPrivateMedia> {
    if (input.visibility !== "PRIVATE") {
      return {
        assetId: input.id,
        descriptor: input,
        url: input.deliveryUrl,
        source: "public",
      };
    }

    const expected = identity(input);
    await this.cache.invalidateMedia(input.id, expected);
    const cached = await this.cache.getMedia(input.id, expected, { allowStale: true });
    if (cached) {
      return {
        assetId: input.id,
        descriptor: input,
        url: this.objectUrl(input.id, cached.blob),
        source: "indexeddb",
      };
    }
    if (!this.isOnline()) {
      throw new Error("Private media is not cached for offline use.");
    }

    let descriptor = input;
    if (isNearlyExpired(descriptor, this.now())) {
      descriptor = await this.getDescriptor(input.id);
    }
    let response = await this.fetchImpl(descriptor.deliveryUrl, { credentials: "omit" });
    if (
      (response.status === 401 || response.status === 403)
      && descriptor.visibility === "PRIVATE"
    ) {
      descriptor = await this.getDescriptor(input.id);
      response = await this.fetchImpl(descriptor.deliveryUrl, { credentials: "omit" });
    }
    if (!response.ok) {
      throw new Error(`Private media download failed with HTTP ${response.status}.`);
    }
    const blob = await response.blob();
    await verifyChecksum(blob, descriptor.checksumSha256);
    const stored = await this.cache.putMedia({
      assetId: descriptor.id,
      assetVersion: String(descriptor.version),
      checksum: descriptor.checksumSha256,
      mimeType: descriptor.mimeType,
      blob,
      ttlMs: MEDIA_BLOB_TTL_MS,
    });
    return {
      assetId: descriptor.id,
      descriptor,
      url: this.objectUrl(descriptor.id, stored.blob),
      source: "network",
    };
  }

  async discard(assetId: string): Promise<void> {
    this.release(assetId);
    await this.cache.deleteMedia(assetId);
  }

  release(assetId: string): void {
    const url = this.objectUrls.get(assetId);
    if (!url) return;
    this.revokeObjectUrl(url);
    this.objectUrls.delete(assetId);
  }

  dispose(): void {
    for (const url of this.objectUrls.values()) this.revokeObjectUrl(url);
    this.objectUrls.clear();
    this.cache.close();
  }
}

let activeResolver: PrivateMediaResolver | undefined;

function currentResolver(): PrivateMediaResolver {
  const ownerUid = auth.currentUser?.uid;
  if (!ownerUid) throw new Error("Authentication is required to resolve private media.");
  if (activeResolver?.ownerUid !== ownerUid) {
    activeResolver?.dispose();
    activeResolver = new PrivateMediaResolver({
      ownerUid,
      cache: new IndexedDbFoundationCache({ ownerUid }),
    });
  }
  return activeResolver;
}

export async function resolveMediaAssetForDisplay(
  descriptor: MediaAssetDescriptor,
): Promise<ResolvedPrivateMedia> {
  try {
    return await currentResolver().resolve(descriptor);
  } catch (error) {
    if (!(error instanceof Error) || !/IndexedDB is not supported/i.test(error.message)) {
      throw error;
    }
    return {
      assetId: descriptor.id,
      descriptor,
      url: descriptor.deliveryUrl,
      source: "direct",
    };
  }
}

export async function discardCachedMedia(assetId: string): Promise<void> {
  if (!activeResolver) return;
  await activeResolver.discard(assetId);
}

export function resetPrivateMediaResolver(): void {
  activeResolver?.dispose();
  activeResolver = undefined;
}
