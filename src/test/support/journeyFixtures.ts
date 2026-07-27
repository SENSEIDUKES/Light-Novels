/**
 * Realistic content fixtures for the journey suite.
 *
 * These are shaped like records the application actually produces: a story with
 * a Codex, two arcs of chapters, and a chapter body carrying prose blocks,
 * dialogue with speakers, a system event and a world card — the exact material
 * the Reader Chamber renders and the persistence layer must round-trip.
 */
import type { Chapter, ChapterContent, StoryBlock, StoryWorld } from '../../types';

export const JOURNEY_UID = 'celestial-reader-uid';
export const OTHER_UID = 'other-account-uid';
export const STORY_ID = '5c1e6a3f-2b40-4a91-9d5c-77a3f0e2b118';

const CREATED_AT = '2026-01-04T09:00:00.000Z';

function chapter(number: number, title: string, overrides: Partial<Chapter> = {}): Chapter {
  return {
    number,
    title,
    premise: `Premise for chapter ${number}.`,
    status: 'unread',
    ...overrides,
  };
}

export function makeStory(overrides: Partial<StoryWorld> = {}): StoryWorld {
  return {
    id: STORY_ID,
    persistenceId: STORY_ID,
    userId: JOURNEY_UID,
    title: 'Ledger of the Azure Gate',
    genre: 'Cultivation',
    mcName: 'Lin Shuye',
    customPremise: 'A disciple audits the heavens.',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    currentChapterNumber: 2,
    persistenceHydration: 'full',
    memory: {
      powerSystem: 'Qi Condensation',
      currentPowerStage: 'Foundation Establishment',
      worldRules: ['Oaths bind spirits.', 'Names spoken thrice summon karma.'],
      characters: [
        {
          id: 'lin-shuye',
          name: 'Lin Shuye',
          role: 'Protagonist',
          description: 'A ledger-keeper turned cultivator.',
          relationshipToMC: 'self',
          status: 'alive',
          powerLevel: 'Foundation Establishment',
          faction: 'Azure Gate',
          aliases: ['Shuye'],
        },
        {
          id: 'elder-kang',
          name: 'Elder Kang',
          role: 'Antagonist',
          description: 'Keeper of the sealed vault.',
          relationshipToMC: 'rival',
          status: 'alive',
          powerLevel: 'Core Formation',
        },
      ],
      locations: [
        {
          id: 'azure-gate',
          name: 'Azure Gate',
          description: 'A thousand-step ascent wreathed in cloud.',
          realm: 'Eastern Continent',
          safetyLevel: 'Dangerous',
        },
      ],
      artifacts: [
        {
          id: 'ledger-of-names',
          name: 'Ledger of Names',
          description: 'Records every debt owed to heaven.',
          tier: 'Spirit',
          condition: 'intact',
        },
      ],
      factions: [
        {
          id: 'azure-gate-sect',
          name: 'Azure Gate Sect',
          description: 'Auditors of the celestial ledger.',
          alignment: 'Righteous',
        },
      ],
      unresolvedPlotThreads: ['Who sealed the vault?'],
      resolvedPlotThreads: [],
    },
    arcs: [
      {
        title: 'Act I: The Thousand Steps',
        isCompleted: false,
        chapters: [
          chapter(1, 'The Thousand Steps', { status: 'read', summary: 'Shuye climbs.' }),
          chapter(2, 'The Sealed Vault'),
          chapter(3, 'The Auditor'),
        ],
      },
    ],
    ...overrides,
  };
}

export function makeChapterBlocks(): StoryBlock[] {
  return [
    {
      id: 'block-1',
      type: 'narration',
      text: 'The azure gate hummed with ancient power as Lin Shuye set foot on the first step.',
      metadata: {
        sceneType: 'ascent',
        environment: ['mountain', 'cloud'],
        atmosphereCategory: 'wind',
        atmosphereTags: ['high-altitude'],
        theme: ['resolve'],
        emotion: 'determined',
        intensity: 3,
        tension: 2,
        mysticism: 4,
        music: { mood: 'travel', intensity: 3 },
        entities: [{ name: 'Lin Shuye', type: 'character', mention: 'reference' }],
      },
    },
    {
      id: 'block-2',
      type: 'dialogue',
      text: 'You audit the heavens with a borrowed brush.',
      metadata: {
        speakerName: 'Elder Kang',
        speakerRole: 'Antagonist',
        mode: 'spoken',
        emotion: 'contempt',
        entities: [{ name: 'Elder Kang', type: 'character', mention: 'reveal' }],
      },
    },
    {
      id: 'block-3',
      type: 'system',
      text: 'Breakthrough achieved.',
      system: {
        kind: 'level_up',
        promptType: 'breakthrough',
        title: 'Realm Ascension',
        rows: [{ label: 'Realm', value: 'Foundation Establishment' }],
      },
    },
    {
      id: 'block-4',
      type: 'world-card',
      text: 'Ledger of Names',
      worldCard: {
        entityType: 'artifact',
        entityName: 'Ledger of Names',
        displayTitle: 'Ledger of Names',
        quote: 'Every debt owed to heaven is written here.',
      },
    },
  ];
}

export function makeChapterContent(
  overrides: Partial<ChapterContent> = {},
): ChapterContent {
  const blocks = makeChapterBlocks();
  return {
    storyId: STORY_ID,
    userId: JOURNEY_UID,
    chapterNumber: 2,
    generatedContent: blocks.map((block) => block.text).join('\n\n'),
    blocks,
    summary: 'Shuye reaches the sealed vault and breaks through.',
    statsChangeMessage: 'Qi +120',
    updatedAt: '2026-01-05T09:00:00.000Z',
    cuePayload: {
      sceneType: 'ascent',
      environment: ['mountain'],
      atmosphereCategory: 'wind',
      intensity: 3,
      music: { mood: 'travel', intensity: 3 },
    },
    ...overrides,
  };
}
