import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaAssetDescriptor } from "../../contracts/mediaAssets";
import type { FoundationCache, FoundationCachedMedia } from "../foundation/cache/types";
import { PrivateMediaResolver } from "./privateMediaResolver";

const descriptor: MediaAssetDescriptor = {
  id: "asset-1",
  assetType: "IMAGE",
  purpose: "STORY_COVER",
  visibility: "PRIVATE",
  status: "READY",
  mimeType: "image/png",
  byteSize: "4",
  checksumSha256: "not-a-real-checksum",
  version: 1,
  deliveryUrl: "https://signed.example/expired",
  deliveryUrlExpiresAt: "2026-07-23T00:00:00.000Z",
  createdAt: "2026-07-22T00:00:00.000Z",
};

function cacheStub(cached: FoundationCachedMedia | null = null): FoundationCache {
  return {
    authoritative: false,
    sourceOfTruth: "remote",
    ownerUid: "owner-a",
    invalidateMedia: vi.fn().mockResolvedValue(false),
    getMedia: vi.fn().mockResolvedValue(cached),
    putMedia: vi.fn().mockImplementation(async (input) => ({
      ...input,
      storageKey: `owner-a:${input.assetId}`,
      ownerUid: "owner-a",
      cachedAt: 1,
      expiresAt: 2,
      evictAfter: 3,
      lastAccessedAt: 1,
      byteSize: input.blob.size,
    })),
    deleteMedia: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  } as unknown as FoundationCache;
}

describe("PrivateMediaResolver", () => {
  let createObjectUrl: (blob: Blob) => string;
  let revokeObjectUrl: (url: string) => void;

  beforeEach(() => {
    createObjectUrl = vi.fn((_blob: Blob) => "blob:cached-cover");
    revokeObjectUrl = vi.fn((_url: string) => undefined);
  });

  it("refreshes an expired signed URL online and stores the immutable blob", async () => {
    const cache = cacheStub();
    const fresh = {
      ...descriptor,
      deliveryUrl: "https://signed.example/fresh",
      deliveryUrlExpiresAt: "2026-07-23T00:15:00.000Z",
    };
    const getDescriptor = vi.fn().mockResolvedValue(fresh);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(["cover"], { type: "image/png" }), { status: 200 }),
    );
    const resolver = new PrivateMediaResolver({
      ownerUid: "owner-a",
      cache,
      getDescriptor,
      fetch: fetchMock,
      now: () => Date.parse("2026-07-23T00:01:00.000Z"),
      createObjectUrl,
      revokeObjectUrl,
    });

    const result = await resolver.resolve(descriptor);

    expect(getDescriptor).toHaveBeenCalledWith(descriptor.id);
    expect(fetchMock).toHaveBeenCalledWith(fresh.deliveryUrl, { credentials: "omit" });
    expect(cache.putMedia).toHaveBeenCalledWith(expect.objectContaining({
      assetId: descriptor.id,
      assetVersion: "1",
    }));
    expect(result).toMatchObject({ url: "blob:cached-cover", source: "network" });
  });

  it("serves an owner-scoped cached cover while offline", async () => {
    const blob = new Blob(["offline"], { type: "image/png" });
    const cache = cacheStub({
      storageKey: "owner-a:asset-1",
      ownerUid: "owner-a",
      assetId: descriptor.id,
      assetVersion: "1",
      checksum: descriptor.checksumSha256,
      mimeType: "image/png",
      blob,
      cachedAt: 1,
      expiresAt: 2,
      evictAfter: 3,
      lastAccessedAt: 1,
      byteSize: blob.size,
      stale: true,
    });
    const resolver = new PrivateMediaResolver({
      ownerUid: "owner-a",
      cache,
      isOnline: () => false,
      fetch: vi.fn(),
      createObjectUrl,
      revokeObjectUrl,
    });

    await expect(resolver.resolve(descriptor)).resolves.toMatchObject({
      source: "indexeddb",
      url: "blob:cached-cover",
    });
  });

  it("invalidates an older manifestation and revokes object URLs on replacement", async () => {
    const cache = cacheStub();
    vi.mocked(cache.invalidateMedia).mockResolvedValue(true);
    const resolver = new PrivateMediaResolver({
      ownerUid: "owner-a",
      cache,
      getDescriptor: vi.fn().mockResolvedValue({
        ...descriptor,
        version: 2,
        deliveryUrlExpiresAt: "2026-07-23T01:00:00.000Z",
      }),
      fetch: vi.fn().mockResolvedValue(
        new Response(new Blob(["v2"], { type: "image/png" }), { status: 200 }),
      ),
      now: () => Date.parse("2026-07-23T00:01:00.000Z"),
      createObjectUrl,
      revokeObjectUrl,
    });

    await resolver.resolve({ ...descriptor, version: 2 });
    await resolver.discard(descriptor.id);

    expect(cache.invalidateMedia).toHaveBeenCalledWith(descriptor.id, {
      assetVersion: "2",
      checksum: descriptor.checksumSha256,
    });
    expect(cache.deleteMedia).toHaveBeenCalledWith(descriptor.id);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:cached-cover");
  });

  it("keeps caches account-scoped", () => {
    const first = new PrivateMediaResolver({
      ownerUid: "owner-a",
      cache: cacheStub(),
      createObjectUrl,
      revokeObjectUrl,
    });
    const secondCache = cacheStub();
    Object.defineProperty(secondCache, "ownerUid", { value: "owner-b" });
    const second = new PrivateMediaResolver({
      ownerUid: "owner-b",
      cache: secondCache,
      createObjectUrl,
      revokeObjectUrl,
    });

    expect(first.ownerUid).toBe("owner-a");
    expect(second.ownerUid).toBe("owner-b");
  });
});
