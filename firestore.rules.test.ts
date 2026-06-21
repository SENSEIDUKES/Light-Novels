import { readFileSync } from "fs";
import { resolve } from "path";
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";

let testEnv: RulesTestEnvironment;
let emulatorReady = false;

beforeAll(async () => {
  try {
    const rules = readFileSync(resolve(__dirname, "./firestore.rules"), "utf8");
    testEnv = await initializeTestEnvironment({
      projectId: "demo-firestore-rules-test",
      firestore: {
        rules,
      },
    });
    emulatorReady = true;
  } catch (e) {
    console.warn("Firestore emulator not running or failed to initialize, skipping rules tests.");
  }
});

beforeEach(async () => {
  if (emulatorReady) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (emulatorReady) await testEnv.cleanup();
});

describe("Firestore Security Rules", () => {
  const ownerUid = "owner_123";
  const otherUid = "other_456";

  const ownerProfile = {
    uid: ownerUid,
    username: "owner",
    joinedDate: "2023-01-01",
    updatedAt: "2023-01-01",
  };

  const validStory = {
    userId: ownerUid,
    id: "story_1",
    title: "The Novel",
    genre: "Fantasy",
    mcName: "Hero",
    customPremise: "A hero's journey",
    createdAt: "2023-01-01",
    updatedAt: "2023-01-01",
    currentChapterNumber: 1,
  };

  const validChapter = {
    storyId: "story_1",
    chapterNumber: 1,
    generatedContent: "Once upon a time...",
  };

  describe("users collection", () => {
    it("should allow a user to create their own profile", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(db.collection("users").doc(ownerUid).set(ownerProfile));
    });

    it("should deny creating a profile for another user (Identity Masking)", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(db.collection("users").doc(otherUid).set({
        ...ownerProfile,
        uid: otherUid
      }));
    });

    it("should deny creating a profile missing required fields", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(db.collection("users").doc(ownerUid).set({ uid: ownerUid }));
    });
  });

  describe("stories collection", () => {
    it("should allow a user to create a story", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(db.collection("stories").doc("story_1").set(validStory));
    });

    it("should deny updating an immutable field (e.g. createdAt)", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const dbAuth = testEnv.authenticatedContext(ownerUid).firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set(validStory);
      });
      
      await assertFails(dbAuth.collection("stories").doc("story_1").update({
        createdAt: "2024-01-01"
      }));
    });

    it("should deny creating a story missing keys (Anti-Update Gap)", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(db.collection("stories").doc("story_1").set({
        userId: ownerUid,
        title: "Test"
      }));
    });

    it("should deny another user from reading or updating the story", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set(validStory);
      });

      const otherDb = testEnv.authenticatedContext(otherUid).firestore();
      await assertFails(otherDb.collection("stories").doc("story_1").get());
      await assertFails(otherDb.collection("stories").doc("story_1").update({ title: "Hacked" }));
    });
  });

  describe("chapters subcollection (Relational Sync)", () => {
    it("should deny creating a chapter if the story doesn't exist", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(db.collection("stories").doc("story_1").collection("chapters").doc("chap_1").set(validChapter));
    });

    it("should allow creating a chapter if owner of parent story", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set(validStory);
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(db.collection("stories").doc("story_1").collection("chapters").doc("chap_1").set(validChapter));
    });

    it("should deny creating a chapter if NOT owner of parent story", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set(validStory);
      });

      const db = testEnv.authenticatedContext(otherUid).firestore();
      await assertFails(db.collection("stories").doc("story_1").collection("chapters").doc("chap_1").set(validChapter));
    });
  });

  describe("lore_glossary collection", () => {
     it("should allow creating lore if owner of parent novel_id", async (ctx) => {
        if (!emulatorReady) return ctx.skip();
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await context.firestore().collection("stories").doc("story_1").set(validStory);
        });

        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertSucceeds(db.collection("lore_glossary").doc("lore_1").set({
            novel_id: "story_1",
            source_text: "Sword",
            target_text: "Espada",
            target_lang: "es"
        }));
     });

     it("should deny creating lore with invalid length strings (Resource Poisoning)", async (ctx) => {
        if (!emulatorReady) return ctx.skip();
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await context.firestore().collection("stories").doc("story_1").set(validStory);
        });
        const largeString = "a".repeat(1001);

        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(db.collection("lore_glossary").doc("lore_1").set({
            novel_id: "story_1",
            source_text: largeString,
            target_text: "Espada",
            target_lang: "es"
        }));
     });

     it("should allow update of target text", async (ctx) => {
        if (!emulatorReady) return ctx.skip();
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const f = context.firestore();
            await f.collection("stories").doc("story_1").set(validStory);
            await f.collection("lore_glossary").doc("lore_1").set({
                novel_id: "story_1",
                source_text: "Sword",
                target_text: "Espada",
                target_lang: "es"
            });
        });

        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertSucceeds(db.collection("lore_glossary").doc("lore_1").update({
            target_text: "Tizona"
        }));
     });

     it("should deny changing the novel_id on update (State Poisoning)", async (ctx) => {
         if (!emulatorReady) return ctx.skip();
         await testEnv.withSecurityRulesDisabled(async (context) => {
            const f = context.firestore();
            await f.collection("stories").doc("story_1").set(validStory);
            await f.collection("lore_glossary").doc("lore_1").set({
                novel_id: "story_1",
                source_text: "Sword",
                target_text: "Espada",
                target_lang: "es"
            });
        });

        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(db.collection("lore_glossary").doc("lore_1").update({
            novel_id: "story_2",
            target_text: "Tizona"
        }));
     });
  });
});
