// @vitest-environment node
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
    if (process.env.CI) {
      throw new Error("Firestore emulator MUST be running in CI environments for security rules tests.\n" + e);
    }
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
  const adminUid = "admin_789";

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
    syncRevision: "story-rev-1",
    currentChapterNumber: 1,
  };

  const validChapter = {
    storyId: "story_1",
    userId: ownerUid,
    chapterNumber: 1,
    generatedContent: "Once upon a time...",
    syncRevision: "chapter-rev-1",
  };

  const validPortrait = {
    schemaVersion: 1,
    id: "portrait_1",
    userId: ownerUid,
    imageUrl: "https://firebasestorage.example.test/portrait_1.webp",
    storagePath: `users/${ownerUid}/portraits/portrait_1.webp`,
    mimeType: "image/webp",
    source: "generated",
    createdAt: "2026-07-14T18:00:00.000Z",
    updatedAt: "2026-07-14T18:00:00.000Z",
    generation: {
      prompt: "Celestial sword cultivator",
      description: "Azure robes and a calm aura",
      daoRank: "Nascent Soul",
      daoXp: 4200,
      powerStage: "Early",
      equippedArtifactId: null,
      usedReferenceImage: false,
    },
    customization: {
      frameId: null,
      glowId: null,
      bannerId: null,
      effectIds: [],
    },
  };

  const validSeed = {
    schemaVersion: 1,
    id: "seed_1",
    userId: ownerUid,
    title: "The Jade Gate",
    intake: {
      novelTitle: "The Jade Gate",
      mcName: "Lin",
      genrePath: "Xianxia",
      corePremise: "A sealed gate awakens.",
      storyTags: ["cultivation", "mystery"],
      customCharacters: [],
      customFactions: [],
      fatePressure: "Balanced",
    },
    blueprint: {
      title: "The Jade Gate",
      logline: "A sealed gate awakens.",
      worldOverview: "A mountain cultivation realm.",
      startingLocation: "Cloud Sect",
      societyStructure: "Sects and clans",
      powerSystemOutline: "Nine cultivation realms",
      mcProfile: "A patient outer disciple",
      majorFactions: ["Cloud Sect"],
      initialCharacters: ["Lin"],
      majorMysteries: ["Who sealed the gate?"],
      firstArcPromise: "Open the first seal",
      tropeRules: "Earn every breakthrough",
      styleBible: "Close third person",
      destinedEnding: "Ascension",
      estimatedArcs: 5,
      unresolvedPlotThreads: ["The missing elder"],
    },
    createdAt: "2026-07-21T12:00:00.000Z",
    updatedAt: "2026-07-21T12:00:00.000Z",
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

    it("should allow a user to select a valid portrait id and reject unsafe ids", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc(ownerUid).set(ownerProfile);
      });

      const profileRef = testEnv.authenticatedContext(ownerUid).firestore()
        .collection("users").doc(ownerUid);
      await assertSucceeds(profileRef.update({ activePortraitId: "portrait_1" }));
      await assertFails(profileRef.update({ activePortraitId: "../other-user" }));
      await assertFails(profileRef.update({ activePortraitId: 123 }));
    });
  });

  describe("users/{userId}/portraits subcollection", () => {
    it("should allow the owner to create, read, customize, and delete a portrait", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const portraitRef = testEnv.authenticatedContext(ownerUid).firestore()
        .collection("users").doc(ownerUid).collection("portraits").doc("portrait_1");

      await assertSucceeds(portraitRef.set(validPortrait));
      await assertSucceeds(portraitRef.get());
      await assertSucceeds(portraitRef.update({
        customization: {
          frameId: "jade_frame",
          glowId: "azure_glow",
          bannerId: null,
          effectIds: ["spirit_motes"],
        },
        updatedAt: "2026-07-14T18:01:00.000Z",
      }));
      await assertSucceeds(portraitRef.delete());
    });

    it("should deny other users and anonymous clients access to an owner's portrait", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc(ownerUid)
          .collection("portraits").doc("portrait_1").set(validPortrait);
      });

      const otherRef = testEnv.authenticatedContext(otherUid).firestore()
        .collection("users").doc(ownerUid).collection("portraits").doc("portrait_1");
      const anonymousRef = testEnv.unauthenticatedContext().firestore()
        .collection("users").doc(ownerUid).collection("portraits").doc("portrait_1");
      await assertFails(otherRef.get());
      await assertFails(otherRef.update({ updatedAt: "2026-07-14T18:02:00.000Z" }));
      await assertFails(otherRef.delete());
      await assertFails(anonymousRef.get());
    });

    it("should keep portrait metadata private from admins and deny admin writes", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("users").doc(adminUid).set({
          uid: adminUid,
          username: "admin",
          role: "admin",
        });
        await db.collection("users").doc(ownerUid)
          .collection("portraits").doc("portrait_1").set(validPortrait);
      });

      const adminRef = testEnv.authenticatedContext(adminUid).firestore()
        .collection("users").doc(ownerUid).collection("portraits").doc("portrait_1");
      await assertFails(adminRef.get());
      await assertFails(adminRef.update({ updatedAt: "2026-07-14T18:03:00.000Z" }));
      await assertFails(adminRef.delete());
    });

    it("should reject malformed, cross-account, and oversized portrait metadata", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const portraits = testEnv.authenticatedContext(ownerUid).firestore()
        .collection("users").doc(ownerUid).collection("portraits");

      await assertFails(portraits.doc("portrait_1").set({
        ...validPortrait,
        userId: otherUid,
      }));
      await assertFails(portraits.doc("portrait_1").set({
        ...validPortrait,
        storagePath: `users/${otherUid}/portraits/portrait_1.webp`,
      }));
      await assertFails(portraits.doc("portrait_1").set({
        ...validPortrait,
        generation: {
          ...validPortrait.generation,
          prompt: "x".repeat(5001),
        },
      }));
      await assertFails(portraits.doc("portrait_1").set({
        ...validPortrait,
        unexpectedField: true,
      }));
    });

    it("should keep identity, generation, and storage metadata immutable", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc(ownerUid)
          .collection("portraits").doc("portrait_1").set(validPortrait);
      });

      const portraitRef = testEnv.authenticatedContext(ownerUid).firestore()
        .collection("users").doc(ownerUid).collection("portraits").doc("portrait_1");
      await assertFails(portraitRef.update({
        imageUrl: "https://attacker.example/portrait.webp",
        updatedAt: "2026-07-14T18:04:00.000Z",
      }));
      await assertFails(portraitRef.update({
        "generation.prompt": "Rewritten provenance",
        updatedAt: "2026-07-14T18:04:00.000Z",
      }));
    });
  });

  describe("users/{userId}/seeds subcollection", () => {
    it("allows the account owner to create, list, read, update, and delete a seed", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const seeds = testEnv.authenticatedContext(ownerUid).firestore()
        .collection("users").doc(ownerUid).collection("seeds");
      const seedRef = seeds.doc("seed_1");

      await assertSucceeds(seedRef.set(validSeed));
      await assertSucceeds(seedRef.get());
      await assertSucceeds(seeds.get());
      await assertSucceeds(seedRef.update({
        title: "The Jade Gate Revised",
        "blueprint.title": "The Jade Gate Revised",
        updatedAt: "2026-07-21T12:01:00.000Z",
      }));
      await assertSucceeds(seedRef.delete());
    });

    it("keeps seeds private from other users, anonymous clients, and admins", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async context => {
        const db = context.firestore();
        await db.collection("users").doc(adminUid).set({
          uid: adminUid,
          username: "admin",
          role: "admin",
        });
        await db.collection("users").doc(ownerUid).collection("seeds").doc("seed_1").set(validSeed);
      });

      const otherSeeds = testEnv.authenticatedContext(otherUid).firestore()
        .collection("users").doc(ownerUid).collection("seeds");
      const adminSeed = testEnv.authenticatedContext(adminUid).firestore()
        .collection("users").doc(ownerUid).collection("seeds").doc("seed_1");
      const anonymousSeed = testEnv.unauthenticatedContext().firestore()
        .collection("users").doc(ownerUid).collection("seeds").doc("seed_1");

      await assertFails(otherSeeds.get());
      await assertFails(otherSeeds.doc("seed_1").get());
      await assertFails(otherSeeds.doc("seed_1").update({ title: "Stolen" }));
      await assertFails(adminSeed.get());
      await assertFails(adminSeed.delete());
      await assertFails(anonymousSeed.get());
    });

    it("rejects cross-account, malformed, and immutable seed changes", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const seedRef = testEnv.authenticatedContext(ownerUid).firestore()
        .collection("users").doc(ownerUid).collection("seeds").doc("seed_1");

      await assertFails(seedRef.set({ ...validSeed, userId: otherUid }));
      await assertFails(seedRef.set({ ...validSeed, unexpectedGeneratedContent: "chapter prose" }));
      await assertFails(seedRef.set({
        ...validSeed,
        blueprint: { ...validSeed.blueprint, estimatedArcs: 0 },
      }));

      await testEnv.withSecurityRulesDisabled(async context => {
        await context.firestore().collection("users").doc(ownerUid)
          .collection("seeds").doc("seed_1").set(validSeed);
      });
      await assertFails(seedRef.update({ id: "seed_2" }));
      await assertFails(seedRef.update({ createdAt: "2026-07-22T00:00:00.000Z" }));
      await assertFails(seedRef.update({ schemaVersion: 2 }));
    });
  });

  describe("stories collection", () => {
    it("should allow a user to create a story", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(db.collection("stories").doc("story_1").set(validStory));
    });

    it("allows an owned seed reference and preserves the seed when the story is tombstoned", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      const seedRef = db.collection("users").doc(ownerUid).collection("seeds").doc("seed_1");
      await assertSucceeds(seedRef.set(validSeed));
      await assertSucceeds(db.collection("stories").doc("story_1").set({
        ...validStory,
        sourceSeedId: "seed_1",
      }));

      await assertSucceeds(db.collection("stories").doc("story_1").set({
        id: "story_1",
        userId: ownerUid,
        deleted: true,
        updatedAt: "2026-07-21T12:02:00.000Z",
      }));
      await assertSucceeds(seedRef.get());
    });

    it("rejects missing or cross-account source seed references", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const ownerDb = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(ownerDb.collection("stories").doc("story_1").set({
        ...validStory,
        sourceSeedId: "missing_seed",
      }));

      await testEnv.withSecurityRulesDisabled(async context => {
        await context.firestore().collection("users").doc(otherUid)
          .collection("seeds").doc("seed_1").set({ ...validSeed, userId: otherUid });
      });
      await assertFails(ownerDb.collection("stories").doc("story_1").set({
        ...validStory,
        sourceSeedId: "seed_1",
      }));
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

    it("should allow updating semantic reading position", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const dbAuth = testEnv.authenticatedContext(ownerUid).firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set(validStory);
      });

      await assertSucceeds(dbAuth.collection("stories").doc("story_1").update({
        syncRevision: "story-rev-2",
        readingAnchor: {
          chapterNumber: 1,
          blockId: "block_1",
          paragraphIndex: 2,
          intraBlockRatio: 0.5,
          savedAt: "2026-07-13T00:00:00.000Z"
        }
      }));
    });

    it("should allow updating sequential chapter generation state", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const dbAuth = testEnv.authenticatedContext(ownerUid).firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set(validStory);
      });

      await assertSucceeds(dbAuth.collection("stories").doc("story_1").update({
        chapterGenerationBatch: {
          id: "batch_1",
          status: "generating",
          chapterNumbers: [2, 3, 4, 5, 6],
          completedChapterNumbers: [2],
          currentChapterNumber: 3,
          createdAt: "2026-07-13T00:00:00.000Z"
        }
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

    it("should deny reviving a tombstoned story through a production-shaped merge write", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const tombstonedStory = {
        ...validStory,
        updatedAt: "2026-07-13T00:00:00.000Z",
        deleted: true,
        memory: {
          powerSystem: "Qi",
          characters: [],
          currentPowerStage: "Foundation",
          worldRules: [],
          unresolvedPlotThreads: [],
          resolvedPlotThreads: []
        },
        arcs: [],
        readingAnchor: {
          chapterNumber: 1,
          blockId: "block_1",
          paragraphIndex: 2,
          intraBlockRatio: 0.5,
          savedAt: "2026-07-13T00:00:00.000Z"
        },
        chapterGenerationBatch: {
          id: "batch_1",
          status: "paused",
          chapterNumbers: [2, 3, 4, 5, 6],
          completedChapterNumbers: [2],
          currentChapterNumber: null,
          createdAt: "2026-07-13T00:00:00.000Z"
        }
      };
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set(tombstonedStory);
      });

      const dbAuth = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(dbAuth.collection("stories").doc("story_1").set({
        ...tombstonedStory,
        updatedAt: "2026-07-13T00:01:00.000Z"
      }, { merge: true }));
      await assertFails(dbAuth.collection("stories").doc("story_1").set({
        ...tombstonedStory,
        updatedAt: "2026-07-13T00:02:00.000Z",
        deleted: false
      }, { merge: true }));
    });

    it("should allow replacing a full story with a content-free tombstone", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set({
          ...validStory,
          memory: { secretDraft: "must be removed" },
          arcs: [{ title: "Private draft", chapters: [] }]
        });
      });

      const tombstone = {
        id: "story_1",
        userId: ownerUid,
        deleted: true,
        updatedAt: "2026-07-13T00:03:00.000Z"
      };
      const dbAuth = testEnv.authenticatedContext(ownerUid).firestore();
      const storyRef = dbAuth.collection("stories").doc("story_1");
      await assertSucceeds(storyRef.set(tombstone));
      const saved = await storyRef.get();
      expect(saved.data()).toEqual(tombstone);
    });

    it("should allow the owner to create a tombstone when the cloud story is absent", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(db.collection("stories").doc("missing_story").set({
        id: "missing_story",
        userId: ownerUid,
        deleted: true,
        updatedAt: "2026-07-13T00:04:00.000Z"
      }));
    });

    it("should deny another account from tombstoning an existing story", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set(validStory);
      });
      const otherDb = testEnv.authenticatedContext(otherUid).firestore();
      await assertFails(otherDb.collection("stories").doc("story_1").set({
        id: "story_1",
        userId: ownerUid,
        deleted: true,
        updatedAt: "2026-07-13T00:05:00.000Z"
      }));
    });

    it("should keep tombstones durable by denying hard delete", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set({
          id: "story_1",
          userId: ownerUid,
          deleted: true,
          updatedAt: "2026-07-13T00:06:00.000Z"
        });
      });
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(db.collection("stories").doc("story_1").delete());
      await assertSucceeds(db.collection("stories").doc("story_1").get());
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

    it("should allow updating a chapter context manifest", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("stories").doc("story_1").set(validStory);
        await db.collection("stories").doc("story_1").collection("chapters").doc("chap_1").set(validChapter);
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(db.collection("stories").doc("story_1").collection("chapters").doc("chap_1").update({
        syncRevision: "chapter-rev-2",
        contextManifest: {
          version: 1,
          route: "generate-chapter-stream",
          generatedAt: "2026-07-13T00:00:00.000Z",
          chapterNumber: 1,
          totalEstimatedTokens: 1200,
          memoryAndHistoryBudgetTokens: 80000,
          memoryAndHistoryEstimatedTokens: 700,
          memoryAndHistoryBudgetExceeded: false,
          providerInputTruncated: false,
          sections: []
        }
      }));
    });

    it("should allow one owner backfill of a legacy chapter owner tag", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("stories").doc("story_1").set(validStory);
        const { userId: _legacyOwner, ...legacyChapter } = validChapter;
        await db.collection("stories").doc("story_1").collection("chapters").doc("chap_1").set(legacyChapter);
      });
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      const chapterRef = db.collection("stories").doc("story_1").collection("chapters").doc("chap_1");
      await assertSucceeds(chapterRef.update({ userId: ownerUid }));
      await assertFails(chapterRef.update({ userId: otherUid }));
    });

    it("should deny creating a chapter if NOT owner of parent story", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("story_1").set(validStory);
      });

      const db = testEnv.authenticatedContext(otherUid).firestore();
      await assertFails(db.collection("stories").doc("story_1").collection("chapters").doc("chap_1").set(validChapter));
    });

    it("should deny chapter writes after the parent story is tombstoned", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("stories").doc("story_1").set({
          ...validStory,
          deleted: true,
        });
        await db.collection("stories").doc("story_1").collection("chapters").doc("existing").set(validChapter);
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(
        db.collection("stories").doc("story_1").collection("chapters").doc("new").set(validChapter),
      );
      await assertFails(
        db.collection("stories").doc("story_1").collection("chapters").doc("existing").update({
          generatedContent: "A stale device tried to restore this.",
        }),
      );
    });

    it("should allow the owner to delete chapter bodies before tombstoning", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection("stories").doc("story_1").set(validStory);
        await db.collection("stories").doc("story_1").collection("chapters").doc("chap_1").set(validChapter);
      });
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(
        db.collection("stories").doc("story_1").collection("chapters").doc("chap_1").delete(),
      );
    });

    it("should deny ordinary accounts access to orphan chapters", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("orphaned").collection("chapters").doc("chap_1").set({
          ...validChapter,
          storyId: "orphaned"
        });
      });
      const db = testEnv.authenticatedContext(otherUid).firestore();
      const orphanRef = db.collection("stories").doc("orphaned").collection("chapters").doc("chap_1");
      await assertFails(orphanRef.get());
      await assertFails(orphanRef.delete());
    });

    it("should not transfer a tagged orphan chapter when another account claims its parent id", async (ctx) => {
      if (!emulatorReady) return ctx.skip();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("stories").doc("claimed_parent").collection("chapters").doc("chap_1").set({
          ...validChapter,
          storyId: "claimed_parent"
        });
      });
      const otherDb = testEnv.authenticatedContext(otherUid).firestore();
      await assertSucceeds(otherDb.collection("stories").doc("claimed_parent").set({
        ...validStory,
        id: "claimed_parent",
        userId: otherUid
      }));
      const chapterRef = otherDb.collection("stories").doc("claimed_parent").collection("chapters").doc("chap_1");
      await assertFails(chapterRef.get());
      await assertFails(chapterRef.update({ generatedContent: "stolen" }));
      await assertFails(chapterRef.delete());
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
