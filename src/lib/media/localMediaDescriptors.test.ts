import { describe, expect, it } from "vitest";
import type { MediaAssetDescriptor } from "../../contracts/mediaAssets";
import { retainLocalMediaDescriptor } from "./localMediaDescriptors";

const descriptor: MediaAssetDescriptor = {
  id: "aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa",
  assetType: "IMAGE",
  purpose: "STORY_COVER",
  visibility: "PRIVATE",
  status: "READY",
  mimeType: "image/png",
  byteSize: "4",
  checksumSha256: "checksum",
  version: 2,
  deliveryUrl: "https://signed.example/cover?X-Amz-Signature=abc",
  deliveryUrlExpiresAt: "2026-07-29T15:00:00.000Z",
  createdAt: "2026-07-29T14:00:00.000Z",
};

describe("retainLocalMediaDescriptor", () => {
  it("canonicalizes identity, blanks delivery, and retains cache identity metadata", () => {
    const retained = retainLocalMediaDescriptor({
      existing: { ...descriptor, id: "existing", deliveryUrl: "" },
    }, descriptor);

    expect(retained).toMatchObject({
      existing: { id: "existing" },
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        version: 2,
        checksumSha256: "checksum",
        deliveryUrl: "",
      },
    });
    expect(JSON.stringify(retained)).not.toContain("X-Amz-Signature");
  });
});
