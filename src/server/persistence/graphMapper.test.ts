// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type {
  AdminCommitMediaAssetToSlotVariables,
  AdminGetOwnedChapterContentGraphData,
  AdminGetOwnedStoryGraphData,
  AdminGetOwnedStorySeedGraphData,
  AdminGetUserProfileGraphData,
} from '../../generated/dataconnect-admin';
import type { ChapterContent, StorySeed, StoryWorld } from '../../types';
import {
  hydrateChapterContent,
  hydrateStorySeed,
  hydrateStoryWorld,
  hydrateUserProfile,
  mapChapterContentToGraphVariables,
  mapStorySeedToGraphVariables,
  mapStoryWorldToGraphVariables,
  mapStoryWorldToPatchVariables,
  mapUserProfileToGraphVariables,
  persistenceUuid,
} from './graphMapper';

const STORY_ID = '11111111-1111-4111-8111-111111111111';
const ARC_ID = '22222222-2222-4222-8222-222222222222';
const CHAPTER_ID = '33333333-3333-4333-8333-333333333333';
const CHARACTER_ID = '44444444-4444-4444-8444-444444444444';
const NOW = '2026-07-22T18:00:00.000Z';

function mutationMetadata() {
  return {
    expectedSyncRevision: 'revision-before',
    newSyncRevision: 'revision-after',
    newRevision: '8',
    idempotencyKey: 'idempotency-key-123',
    requestHash: 'request-hash',
  };
}

function storyGraph(): AdminGetOwnedStoryGraphData {
  return {
    story: {
      id: STORY_ID,
      ownerUid: 'owner-a',
      clientStoryId: 'story-client',
      title: 'Moon Archive',
      genre: 'Xianxia',
      mainCharacterName: 'Lin',
      premise: 'Recover the archive.',
      status: 'ACTIVE',
      visibility: 'PRIVATE',
      currentChapterNumber: 1,
      syncRevision: 'revision-before',
      revision: '7',
      schemaVersion: 1,
      evolutionReady: false,
      availableVisualUpdate: false,
      isEdited: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    members: [{ storyId: STORY_ID, userUid: 'owner-a', role: 'OWNER', createdAt: NOW }],
    preferences: [{
      storyId: STORY_ID,
      hardcoreFateMode: false,
      motionCoverActive: false,
      updatedAt: NOW,
    }],
    readerPreferences: [],
    memoryStates: [{ storyId: STORY_ID, powerSystem: 'Moon Qi', currentPowerStage: 'Mortal', updatedAt: NOW }],
    memoryWarnings: [],
    rules: [{
      id: '55555555-5555-4555-8555-555555555555',
      ruleKey: 'world-rule-1',
      ruleValue: 'Oaths bind spirits.',
      isPinned: false,
      position: 0,
      updatedAt: NOW,
    }],
    revealBackdrops: [],
    arcs: [{
      id: ARC_ID,
      arcNumber: 1,
      title: 'First Moon',
      status: 'ACTIVE',
      createdAt: NOW,
      updatedAt: NOW,
    }],
    chapters: [{
      id: CHAPTER_ID,
      storyId: STORY_ID,
      arcId: ARC_ID,
      clientChapterId: 'chapter-client-1',
      chapterNumber: 1,
      title: 'Awakening',
      premise: 'Lin wakes.',
      status: 'READ',
      syncRevision: 'chapter-revision',
      revision: '2',
      isSealed: false,
      hasContinuityFaults: false,
      createdAt: NOW,
      updatedAt: NOW,
    }],
    codexEntities: [
      {
        id: CHARACTER_ID,
        stableKey: 'lin',
        kind: 'CHARACTER',
        name: 'Lin',
        role: 'Protagonist',
        description: 'Moon cultivator',
        status: 'alive',
        relationshipToMainCharacter: 'Self',
        relevanceState: 'ACTIVE',
        isUserPinned: false,
        pendingEvolution: false,
        evolutionReady: false,
        availableVisualUpdate: false,
        createdAt: NOW,
        updatedAt: NOW,
        aliases: [{ alias: 'Young Moon', normalizedAlias: 'young moon', isCanonical: false }],
        attributes: [{ attributeKey: 'powerLevel', stringValue: 'Mortal', updatedAt: NOW }],
        progression: [],
        threadLinks: [],
      },
      {
        id: '66666666-6666-4666-8666-666666666666',
        stableKey: 'sealed-door',
        kind: 'MYSTERY',
        name: 'Sealed Door',
        description: 'An intentionally server-owned mystery.',
        relevanceState: 'WARM',
        isUserPinned: true,
        pendingEvolution: false,
        evolutionReady: false,
        availableVisualUpdate: false,
        createdAt: NOW,
        updatedAt: NOW,
        aliases: [],
        attributes: [{ attributeKey: 'clues', stringListValue: ['moon'], updatedAt: NOW }],
        progression: [],
        threadLinks: [],
      },
    ],
    codexRelationships: [],
    plotThreads: [],
    karmaNodes: [],
    timelineEvents: [{
      id: '77777777-7777-4777-8777-777777777777',
      chapterId: CHAPTER_ID,
      chapterNumber: 1,
      title: 'The door stirred',
      description: 'A server-owned timeline event.',
      createdAt: NOW,
    }],
    bookmarks: [],
    readingProgresses: [],
    arcReadingProgresses: [],
    glossaryTerms: [{
      id: '88888888-8888-4888-8888-888888888888',
      sourceText: 'Qi',
      targetText: 'Energy',
      targetLanguage: 'en',
      createdAt: NOW,
      updatedAt: NOW,
    }],
    generationJobs: [{
      id: '99999999-9999-4999-8999-999999999999',
      chapterId: CHAPTER_ID,
      kind: 'CHAPTER',
      status: 'SUCCEEDED',
      attemptCount: 1,
      createdAt: NOW,
      updatedAt: NOW,
      events: [{
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        eventType: 'completed',
        createdAt: NOW,
      }],
    }],
    generationBatches: [],
    mediaSlots: [
      {
        targetKind: 'STORY',
        targetKey: STORY_ID,
        purpose: 'STORY_COVER',
        currentAssetId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        version: '1',
        updatedAt: NOW,
      },
      {
        targetKind: 'CHARACTER',
        targetKey: 'lin',
        purpose: 'MANIFESTATION',
        entityId: CHARACTER_ID,
        currentAssetId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        version: '1',
        updatedAt: NOW,
      },
    ],
    mediaAttachments: [{
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      assetId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      entityId: CHARACTER_ID,
      targetKind: 'CHARACTER',
      targetKey: 'lin',
      purpose: 'MANIFESTATION',
      clientHistoryId: 'history-lin-1',
      promptUsed: 'Moonlight portrait',
      position: 0,
      isCurrent: true,
      createdAt: NOW,
    }],
    deletionJobs: [],
  } as unknown as AdminGetOwnedStoryGraphData;
}

function chapterGraph(): AdminGetOwnedChapterContentGraphData {
  return {
    chapter: {
      id: CHAPTER_ID,
      storyId: STORY_ID,
      arcId: ARC_ID,
      clientChapterId: 'chapter-client-1',
      chapterNumber: 1,
      title: 'Awakening',
      premise: 'Lin wakes.',
      status: 'READ',
      syncRevision: 'revision-before',
      revision: '7',
      isSealed: false,
      hasContinuityFaults: false,
      createdAt: NOW,
      updatedAt: NOW,
      content: {
        generatedContent: 'Moonlight filled the archive.',
        revision: '7',
        syncRevision: 'revision-before',
        updatedAt: NOW,
      },
      blocks: [{
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        legacyBlockId: 'block-one',
        position: 0,
        blockType: 'paragraph',
        text: 'Moonlight filled the archive.',
        isArchived: false,
        attributes: [{ attributeKey: 'emphasis', booleanValue: true }],
        entityMentions: [],
      }],
      translations: [{
        languageCode: 'es',
        title: 'Despertar',
        content: 'La luz lunar llenó el archivo.',
        translatedAt: NOW,
      }],
      audioManifest: {
        version: '1',
        language: 'en',
        generatedAt: NOW,
        updatedAt: NOW,
      },
      voiceClips: [{
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        blockId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        position: 0,
        speakerVoice: 'sage',
        assetId: '12121212-1212-4212-8212-121212121212',
        createdAt: NOW,
      }],
    },
    fingerprints: [],
    facts: [],
  } as unknown as AdminGetOwnedChapterContentGraphData;
}

describe('story graph mapping', () => {
  it('hydrates normalized rows and preserves server-owned rows in the exact write manifest', () => {
    const currentGraph = storyGraph();
    const story = hydrateStoryWorld(currentGraph);
    expect(story).not.toBeNull();
    expect(story).toMatchObject({
      id: 'story-client',
      persistenceId: STORY_ID,
      coverAssetId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      memory: {
        powerSystem: 'Moon Qi',
        characters: [{ id: 'lin', imageAssetId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }],
      },
    });
    expect(story?.memory.characters[0].imageUrl).toBeUndefined();
    expect(story?.memory.characters[0].imageHistory?.[0]).toMatchObject({
      id: 'history-lin-1',
      assetId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      imageUrl: '',
    });

    const variables = mapStoryWorldToGraphVariables({
      ownerUid: 'owner-a',
      story: { ...story!, title: 'Moon Archive Revised' },
      currentGraph,
      ...mutationMetadata(),
    });
    expect(Object.keys(variables).sort()).toEqual([
      'abilityProgression', 'abilityProgressionIds', 'arcIds', 'arcReadingProgresses',
      'arcs', 'bookmarkIds', 'bookmarks', 'chapterIds', 'chapters', 'codexAliases',
      'codexAttributes', 'codexEntities', 'codexEntityIds', 'codexRelationshipIds',
      'codexRelationships', 'codexThreadLinks', 'expectedSyncRevision', 'generationBatchIds',
      'generationBatchItems', 'generationBatches', 'generationEventIds', 'generationEvents',
      'generationJobIds', 'generationJobs', 'glossaryTermIds', 'glossaryTerms', 'idempotencyKey',
      'karmaNodeIds', 'karmaNodes', 'memberUserUids', 'members', 'memoryStates',
      'memoryWarningIds', 'memoryWarnings', 'newRevision', 'newSyncRevision', 'ownerUid',
      'plotThreadIds', 'plotThreads', 'preferences', 'readerPreferenceUserUids',
      'readerPreferences', 'readingProgressUserUids', 'readingProgresses', 'requestHash',
      'revealBackdropKeys', 'revealBackdrops', 'ruleIds', 'rules', 'story', 'storyId',
      'timelineEventIds', 'timelineEvents',
    ].sort());
    expect(variables.story).toMatchObject({ id: STORY_ID, title: 'Moon Archive Revised' });
    expect(variables.glossaryTerms).toHaveLength(1);
    expect(variables.generationJobs).toHaveLength(1);
    expect(variables.generationEvents).toHaveLength(1);
    expect(variables.timelineEvents).toHaveLength(1);
    expect(variables.codexEntities).toContainEqual(expect.objectContaining({
      stableKey: 'sealed-door',
      kind: 'MYSTERY',
    }));
    expect(Object.keys(variables)).not.toContain('mediaSlots');
    expect(JSON.stringify(variables)).not.toContain('imageUrl');
  });

  it('derives stable UUIDs for legacy client IDs', () => {
    expect(persistenceUuid('legacy-id', 'story')).toBe(persistenceUuid('legacy-id', 'story'));
    expect(persistenceUuid('legacy-id', 'story')).not.toBe(persistenceUuid('other-id', 'story'));
    expect(persistenceUuid(`story-${STORY_ID}`, 'story')).toBe(STORY_ID);
  });

  it('bounds a one-entity Codex update in a realistic 100-chapter graph', () => {
    const currentGraph = storyGraph();
    currentGraph.chapters = Array.from({ length: 100 }, (_, index) => ({
      ...currentGraph.chapters[0],
      id: `33333333-3333-4333-8333-${String(index + 1).padStart(12, '0')}`,
      clientChapterId: `chapter-client-${index + 1}`,
      chapterNumber: index + 1,
      title: `Chapter ${index + 1}`,
    }));
    currentGraph.story!.currentChapterNumber = 100;
    const current = hydrateStoryWorld(currentGraph)!;
    const desired = structuredClone(current);
    desired.updatedAt = '2026-07-22T18:01:00.000Z';
    desired.memory.characters[0].description = 'Moon cultivator, newly sworn.';

    const startedAt = performance.now();
    const patch = mapStoryWorldToPatchVariables({
      ownerUid: 'owner-a',
      story: desired,
      currentGraph,
      ...mutationMetadata(),
    });
    const durationMs = performance.now() - startedAt;
    const { affectedRowCount, ...wireVariables } = patch;
    const requestBytes = Buffer.byteLength(JSON.stringify(wireVariables));

    expect(patch.chapters).toHaveLength(0);
    expect(patch.arcs).toHaveLength(0);
    expect(patch.codexEntities).toEqual([
      expect.objectContaining({ stableKey: 'lin', description: 'Moon cultivator, newly sworn.' }),
    ]);
    expect(affectedRowCount).toBeLessThanOrEqual(3);
    expect(requestBytes).toBeLessThan(12_000);
    expect(durationMs).toBeLessThan(250);
  });

  it('measures bounded hot paths against a 100-chapter, substantial-Codex story', () => {
    const currentGraph = storyGraph();
    currentGraph.chapters = Array.from({ length: 100 }, (_, index) => ({
      ...currentGraph.chapters[0],
      id: `33333333-3333-4333-8333-${String(index + 1).padStart(12, '0')}`,
      clientChapterId: `chapter-client-${index + 1}`,
      chapterNumber: index + 1,
      title: `Chapter ${index + 1}`,
    }));
    currentGraph.story!.currentChapterNumber = 100;
    currentGraph.codexEntities = Array.from({ length: 40 }, (_, index) => ({
      ...currentGraph.codexEntities[0],
      id: `44444444-4444-4444-8444-${String(index + 1).padStart(12, '0')}`,
      stableKey: `cultivator-${index + 1}`,
      name: `Cultivator ${index + 1}`,
      description: `Cultivator ${index + 1} has a detailed history across the hundred-chapter fixture.`,
      aliases: [{
        alias: `Disciple ${index + 1}`,
        normalizedAlias: `disciple ${index + 1}`,
        isCanonical: false,
      }],
      attributes: [
        { attributeKey: 'powerLevel', stringValue: `Realm ${index + 1}`, updatedAt: NOW },
        { attributeKey: 'abilities', stringListValue: [`Art ${index + 1}`, `Step ${index + 1}`], updatedAt: NOW },
      ],
    })) as typeof currentGraph.codexEntities;
    const current = hydrateStoryWorld(currentGraph)!;
    const metrics: Record<string, { requestBytes: number; affectedRows: number; durationMs: number }> = {};
    const measure = <T>(
      name: string,
      build: () => T,
      affectedRows: (value: T) => number,
    ): T => {
      const startedAt = performance.now();
      const value = build();
      const requestBytes = Buffer.byteLength(JSON.stringify(value));
      metrics[name] = {
        requestBytes,
        affectedRows: affectedRows(value),
        durationMs: Number((performance.now() - startedAt).toFixed(3)),
      };
      return value;
    };

    const readerStory = structuredClone(current);
    readerStory.updatedAt = '2026-07-22T18:02:00.000Z';
    readerStory.lastReadChapter = 73;
    readerStory.lastReadAt = readerStory.updatedAt;
    readerStory.readingStats = { totalReadingTimeMs: 987_654 };
    const readerPatch = measure(
      'readerProgress',
      () => mapStoryWorldToPatchVariables({
        ownerUid: 'owner-a',
        story: readerStory,
        currentGraph,
        ...mutationMetadata(),
      }),
      value => value.affectedRowCount,
    );

    const codexStory = structuredClone(current);
    codexStory.updatedAt = '2026-07-22T18:03:00.000Z';
    codexStory.memory.characters[19].description = 'Updated after a bounded cultivation breakthrough.';
    const codexPatch = measure(
      'codexEntity',
      () => mapStoryWorldToPatchVariables({
        ownerUid: 'owner-a',
        story: codexStory,
        currentGraph,
        ...mutationMetadata(),
      }),
      value => value.affectedRowCount,
    );

    const chapterCurrent = chapterGraph();
    const chapter = hydrateChapterContent(chapterCurrent)!;
    const chapterWrite = measure(
      'chapterSave',
      () => mapChapterContentToGraphVariables({
        ownerUid: 'owner-a',
        storyId: STORY_ID,
        content: {
          ...chapter,
          generatedContent: `${chapter.generatedContent}\n${'A bounded chapter paragraph. '.repeat(120)}`,
          updatedAt: '2026-07-22T18:04:00.000Z',
        },
        currentGraph: chapterCurrent,
        ...mutationMetadata(),
      }),
      value => 7 + [
        value.blocks,
        value.blockAttributes,
        value.blockEntityMentions,
        value.translations,
        value.fingerprints,
        value.facts,
        value.factSupersessions,
        value.audioManifests,
        value.voiceClips,
      ].reduce((total, rows) => total + rows.length, 0),
    );

    const coverCommit = measure(
      'coverChange',
      () => ({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
        ownerUid: 'owner-a',
        quotaReservationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
        idempotencyKey: 'cover-change-scale-test',
        etag: 'cover-etag',
        storyId: STORY_ID,
        targetKind: 'STORY',
        targetKey: STORY_ID,
        purpose: 'STORY_COVER',
        attachmentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
        historyEntityType: 'cover',
        clientHistoryId: 'cover-history-2',
        promptUsed: 'Moon archive cover',
        position: 1,
        expectedCurrentAssetId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        expectedSlotVersion: '1',
        newSlotVersion: '2',
      } satisfies AdminCommitMediaAssetToSlotVariables),
      () => 7,
    );

    expect(readerPatch.readingProgresses).toHaveLength(1);
    expect(readerPatch.chapters).toHaveLength(0);
    expect(codexPatch.codexEntities).toHaveLength(1);
    expect(codexPatch.chapters).toHaveLength(0);
    expect(chapterWrite.blocks).toHaveLength(1);
    expect(coverCommit.targetKind).toBe('STORY');
    expect(metrics.chapterSave.requestBytes).toBeLessThan(20_000);
    expect(metrics.coverChange.requestBytes).toBeLessThan(2_000);
    expect(metrics.readerProgress.requestBytes).toBeLessThan(12_000);
    expect(metrics.codexEntity.requestBytes).toBeLessThan(12_000);
    expect(Math.max(...Object.values(metrics).map(value => value.durationMs))).toBeLessThan(250);
    console.info(`[persistence-scale] ${JSON.stringify(metrics)}`);
  });
});

describe('chapter content graph mapping', () => {
  it('round-trips content and strips transient URLs from bounded Any columns', () => {
    const currentGraph = chapterGraph();
    const content = hydrateChapterContent(currentGraph);
    expect(content).toMatchObject({
      storyId: STORY_ID,
      chapterNumber: 1,
      generatedContent: 'Moonlight filled the archive.',
      blocks: [{ id: 'block-one' }],
      translations: { es: { title: 'Despertar' } },
    });
    const signedUrl = 'https://provider.example/render.png?X-Amz-Signature=temporary';
    const changed: ChapterContent = {
      ...content!,
      blocks: [{
        ...content!.blocks![0],
        metadata: {
          music: { mood: 'mystery', customUrl: signedUrl, trackId: 'catalog-track' },
        },
        worldCard: {
          entityType: 'character',
          entityName: 'Lin',
          displayTitle: 'Lin',
          imageUrl: signedUrl,
          audioType: 'tts_line',
        },
      }],
    };
    const variables = mapChapterContentToGraphVariables({
      ownerUid: 'owner-a',
      storyId: STORY_ID,
      content: changed,
      currentGraph,
      ...mutationMetadata(),
    });
    expect(Object.keys(variables).sort()).toEqual([
      'audioManifests', 'blockAttributes', 'blockEntityMentions', 'blockIds', 'blocks',
      'chapter', 'chapterId', 'content', 'expectedSyncRevision', 'factIds',
      'factSupersessions', 'facts', 'fingerprintIds', 'fingerprints', 'idempotencyKey',
      'newRevision', 'newSyncRevision', 'ownerUid', 'requestHash', 'storyId',
      'translationLanguages', 'translations', 'voiceClipIds', 'voiceClips',
    ].sort());
    expect(variables.blockAttributes).toEqual([
      expect.objectContaining({ attributeKey: 'emphasis', booleanValue: true }),
    ]);
    expect(variables.translations).toHaveLength(1);
    expect(variables.voiceClips[0]).toMatchObject({
      assetId: '12121212-1212-4212-8212-121212121212',
    });
    expect(JSON.stringify(variables)).not.toContain(signedUrl);
    expect(variables.blocks[0]).toMatchObject({
      music: { mood: 'mystery', trackId: 'catalog-track' },
      worldCard: expect.not.objectContaining({ imageUrl: expect.anything() }),
    });
  });
});

describe('story seed graph mapping', () => {
  it('preserves one-item arrays and entity aliases through normalized field rows', () => {
    const seed: StorySeed = {
      schemaVersion: 1,
      id: 'seed-client',
      userId: 'owner-a',
      title: 'Moon Seed',
      createdAt: NOW,
      updatedAt: NOW,
      intake: {
        novelTitle: 'Moon Seed',
        storyTags: ['cultivation'],
        customCharacters: [{
          id: 'seed-character-lin',
          name: 'Lin',
          aliases: ['Young Moon'],
          connectionToMC: 'Self',
        }],
        customFactions: [],
      },
      blueprint: {
        title: 'Moon Seed',
        logline: 'A sealed archive wakes.',
        worldOverview: 'A moonlit realm.',
        startingLocation: 'Archive',
        societyStructure: 'Sects',
        powerSystemOutline: 'Moon Qi',
        mcProfile: 'Lin',
        majorFactions: ['Moon Sect'],
        initialCharacters: ['Lin'],
        majorMysteries: ['Sealed Door'],
        firstArcPromise: 'Open the door.',
        tropeRules: 'Earn power.',
        styleBible: 'Lyrical.',
        estimatedArcs: 3,
        unresolvedPlotThreads: ['Open the door'],
      },
    } as StorySeed;
    const variables = mapStorySeedToGraphVariables({
      ownerUid: 'owner-a',
      seed,
      currentGraph: null,
      ...mutationMetadata(),
    });
    expect(Object.keys(variables).sort()).toEqual([
      'entities', 'entityAliases', 'entityIds', 'expectedSyncRevision', 'fields',
      'idempotencyKey', 'newRevision', 'newSyncRevision', 'ownerUid', 'requestHash',
      'seed', 'seedId',
    ].sort());
    expect(variables.entityAliases).toEqual([
      expect.objectContaining({ alias: 'Young Moon', normalizedAlias: 'young moon' }),
    ]);
    const graph = {
      storySeed: {
        ...variables.seed,
        fields: variables.fields,
        entities: variables.entities.map(entity => ({
          ...entity,
          aliases: variables.entityAliases.filter(alias => alias.seedEntityId === entity.id),
        })),
      },
    } as unknown as AdminGetOwnedStorySeedGraphData;
    const hydrated = hydrateStorySeed(graph);
    expect(hydrated?.intake.storyTags).toEqual(['cultivation']);
    expect(hydrated?.blueprint.majorFactions).toEqual(['Moon Sect']);
    expect(hydrated?.intake.customCharacters?.[0]).toMatchObject({
      id: 'seed-character-lin',
      aliases: ['Young Moon'],
    });
  });
});

describe('user profile graph mapping', () => {
  it('assigns distinct stable usernames to minimal profiles', () => {
    const ownerA = mapUserProfileToGraphVariables({
      ownerUid: 'owner-a',
      patch: { uid: 'owner-a' },
      currentGraph: null,
      ...mutationMetadata(),
    });
    const ownerB = mapUserProfileToGraphVariables({
      ownerUid: 'owner-b',
      patch: { uid: 'owner-b', username: '   ' },
      currentGraph: null,
      ...mutationMetadata(),
    });

    expect(ownerA.profile.username).toMatch(/^user_[a-f0-9]{64}$/);
    expect(ownerB.profile.username).toMatch(/^user_[a-f0-9]{64}$/);
    expect(ownerA.profile.username).not.toBe(ownerB.profile.username);
  });

  it('merges a partial profile update without deleting inventory, effects, progress, or preferences', () => {
    const currentGraph = {
      account: {
        uid: 'owner-a', email: 'reader@example.com', displayName: 'Reader', role: 'USER',
        createdAt: NOW, updatedAt: NOW,
      },
      profile: {
        userUid: 'owner-a', username: 'reader', subscriptionTier: 'MORTAL',
        daoXp: '10', heavenlyQi: '2', sectQi: '3', demonicQi: '0', writingStreak: 1,
        savedStoryCount: 2, imageGenerationCount: 3, daoPillarStreak: 1,
        daoPillarCracked: false, syncRevision: 'revision-before', revision: '7',
        createdAt: NOW, updatedAt: NOW,
      },
      preferences: { userUid: 'owner-a', theme: 'void', updatedAt: NOW },
      inventory: [{
        id: '13131313-1313-4313-8313-131313131313', clientItemId: 'artifact-client',
        itemKind: 'COSMIC_ARTIFACT', name: 'Moon Token', description: 'A token.',
        rarity: 'Rare', status: 'unsubmitted', sourceMilestone: 'First Moon',
        milestoneType: 'chapter_seal', acquiredAt: NOW, updatedAt: NOW,
      }],
      activeEffects: [{
        id: '14141414-1414-4414-8414-141414141414', clientEffectId: 'effect-client',
        sourceInventoryItemId: '13131313-1313-4313-8313-131313131313', name: 'Moon Blessing',
        effectType: 'Blessing', description: 'Brightens qi.', durationMs: '1000',
        scope: 'Account-wide', appliedAt: NOW, expiresAt: NOW, isUnlockedReward: false,
        createdAt: NOW, updatedAt: NOW,
      }],
      progressEvents: [{
        id: '15151515-1515-4515-8515-151515151515', eventType: 'chapter', amount: '10',
        idempotencyKey: 'progress-key', createdAt: NOW,
      }],
      portraits: [],
    } as unknown as AdminGetUserProfileGraphData;
    expect(hydrateUserProfile(currentGraph)).toMatchObject({
      uid: 'owner-a',
      cosmicInventory: [{ id: 'artifact-client', name: 'Moon Token' }],
      activeStatusEffects: [{ id: 'effect-client', sourceArtifactId: 'artifact-client' }],
    });
    const variables = mapUserProfileToGraphVariables({
      ownerUid: 'owner-a',
      patch: { displayName: 'Reader Revised' },
      currentGraph,
      ...mutationMetadata(),
    });
    expect(Object.keys(variables).sort()).toEqual([
      'account', 'effectIds', 'effects', 'expectedSyncRevision', 'idempotencyKey',
      'inventory', 'inventoryIds', 'newRevision', 'newSyncRevision', 'ownerUid',
      'preferences', 'profile', 'progressEventIds', 'progressEvents', 'requestHash',
    ].sort());
    expect(variables.account).toMatchObject({
      email: 'reader@example.com',
      displayName: 'Reader Revised',
    });
    expect(variables.inventory).toHaveLength(1);
    expect(variables.effects).toHaveLength(1);
    expect(variables.progressEvents).toHaveLength(1);
    expect(variables.preferences).toEqual([expect.objectContaining({ theme: 'void' })]);
  });
});
