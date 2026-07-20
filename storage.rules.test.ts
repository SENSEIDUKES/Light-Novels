// @vitest-environment node
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";

process.env.GCLOUD_PROJECT = "demo-storage-rules-test";

let testEnv: RulesTestEnvironment;
let emulatorReady = false;

beforeAll(async () => {
  try {
    const rules = readFileSync(resolve(__dirname, "./storage.rules"), "utf8");
    testEnv = await initializeTestEnvironment({
      projectId: "demo-storage-rules-test",
      storage: {
        rules,
      },
    });
    emulatorReady = true;
  } catch (e) {
    if (process.env.CI && process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
      throw new Error("Storage emulator rules tests failed to initialize.\n" + e);
    }
    console.warn("Storage emulator not running or failed to initialize, skipping storage rules tests.");
  }
});

beforeEach(async () => {
  if (emulatorReady) await testEnv.clearStorage();
});

afterAll(async () => {
  if (emulatorReady) await testEnv.cleanup();
});

describe("Cultivator portrait Storage Security Rules", () => {
  const ownerUid = "owner_123";
  const otherUid = "other_456";
  const portraitPath = `users/${ownerUid}/portraits/portrait_1.webp`;

  it("should allow the signed-in owner to upload, read, and delete a valid portrait", async (ctx) => {
    if (!emulatorReady) return ctx.skip();
    const portraitRef = testEnv.authenticatedContext(ownerUid).storage().ref(portraitPath);

    await assertSucceeds(Promise.resolve(portraitRef.put(
      new Uint8Array([1, 2, 3]),
      { contentType: "image/webp" },
    )));
    await assertSucceeds(portraitRef.getMetadata());
    await assertSucceeds(portraitRef.delete());
  });

  it("should deny other accounts and anonymous clients all access", async (ctx) => {
    if (!emulatorReady) return ctx.skip();
    const ownerRef = testEnv.authenticatedContext(ownerUid).storage().ref(portraitPath);
    await assertSucceeds(Promise.resolve(ownerRef.put(
      new Uint8Array([1, 2, 3]),
      { contentType: "image/webp" },
    )));

    const otherRef = testEnv.authenticatedContext(otherUid).storage().ref(portraitPath);
    const anonymousRef = testEnv.unauthenticatedContext().storage().ref(portraitPath);
    await assertFails(otherRef.getMetadata());
    await assertFails(Promise.resolve(otherRef.put(
      new Uint8Array([4, 5, 6]),
      { contentType: "image/webp" },
    )));
    await assertFails(otherRef.delete());
    await assertFails(anonymousRef.getMetadata());

    // Explicit cleanup
    await assertSucceeds(ownerRef.delete());
  });

  it("should reject unsafe filenames and paths outside the portrait namespace", async (ctx) => {
    if (!emulatorReady) return ctx.skip();
    const storage = testEnv.authenticatedContext(ownerUid).storage();

    await assertFails(Promise.resolve(storage.ref(
      `users/${ownerUid}/portraits/portrait.final.png`,
    ).put(new Uint8Array([1]), { contentType: "image/png" })));
    await assertFails(Promise.resolve(storage.ref(
      `users/${ownerUid}/avatars/portrait_1.png`,
    ).put(new Uint8Array([1]), { contentType: "image/png" })));
  });

  it("should accept only jpeg, png, and webp content matching the extension", async (ctx) => {
    if (!emulatorReady) return ctx.skip();
    const storage = testEnv.authenticatedContext(ownerUid).storage();

    await assertFails(Promise.resolve(storage.ref(
      `users/${ownerUid}/portraits/portrait_1.gif`,
    ).put(new Uint8Array([1]), { contentType: "image/gif" })));
    await assertFails(Promise.resolve(storage.ref(
      `users/${ownerUid}/portraits/portrait_1.png`,
    ).put(new Uint8Array([1]), { contentType: "image/jpeg" })));
    const portraitJpgRef = storage.ref(`users/${ownerUid}/portraits/portrait_1.jpg`);
    await assertSucceeds(Promise.resolve(portraitJpgRef.put(
      new Uint8Array([1]),
      { contentType: "image/jpeg" },
    )));

    // Explicit cleanup
    await assertSucceeds(portraitJpgRef.delete());
  });

  it("should reject portraits larger than 10 MiB", async (ctx) => {
    if (!emulatorReady) return ctx.skip();
    const portraitRef = testEnv.authenticatedContext(ownerUid).storage().ref(portraitPath);

    await assertFails(Promise.resolve(portraitRef.put(
      new Uint8Array(10 * 1024 * 1024 + 1),
      { contentType: "image/webp" },
    )));
  });

  it("should keep accepted portrait objects immutable", async (ctx) => {
    if (!emulatorReady) return ctx.skip();
    const portraitRef = testEnv.authenticatedContext(ownerUid).storage().ref(portraitPath);
    
    await assertSucceeds(Promise.resolve(portraitRef.put(
      new Uint8Array([1, 2, 3]),
      { contentType: "image/webp" },
    )));

    await assertFails(Promise.resolve(portraitRef.put(
      new Uint8Array([4, 5, 6]),
      { contentType: "image/webp" },
    )));
    await assertFails(portraitRef.updateMetadata({ contentType: "image/webp" }));
    await assertFails(portraitRef.updateMetadata({ contentType: "text/plain" }));

    // Explicit cleanup
    await assertSucceeds(portraitRef.delete());
  });
});
