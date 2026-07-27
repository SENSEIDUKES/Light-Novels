import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivingCodexCollage } from './LivingCodexCollage';
import type { StoryMemory, StoryWorld } from '../../types';

/**
 * These cases pin the collage to the records that survive a cloud round-trip.
 *
 * PostgreSQL rebuilds `story.imageHistory` from `targetKind: 'STORY'` media
 * attachments alone, so it only ever carries covers. Codex manifestations are
 * attached to their own entity and chapter heroes to their chapter. Sourcing
 * the collage from the story-level history meant every portrait disappeared as
 * soon as Harmony replaced the local replica with the cloud shape.
 */

const baseMemory: StoryMemory = {
  powerSystem: 'Qi',
  currentPowerStage: 'Mortal',
  worldRules: [],
  characters: [],
  unresolvedPlotThreads: [],
  resolvedPlotThreads: [],
  locations: [],
  artifacts: [],
  factions: [],
};

function buildStory(overrides: Partial<StoryWorld> = {}): StoryWorld {
  return {
    id: 'story-1',
    title: 'Volume 1: The First Petal of Eternity',
    genre: 'Xianxia',
    mcName: 'Lin Yao',
    customPremise: 'A discarded disciple inherits a dying world.',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-25T00:00:00.000Z',
    currentChapterNumber: 3,
    memory: baseMemory,
    arcs: [],
    ...overrides,
  } as unknown as StoryWorld;
}

function renderCollage(story: StoryWorld) {
  return render(<LivingCodexCollage activeStory={story} memory={story.memory} />);
}

describe('LivingCodexCollage', () => {
  it('renders entity portraits the cloud stores on the entity, not on the story', () => {
    const memory: StoryMemory = {
      ...baseMemory,
      characters: [
        {
          id: 'char-1',
          name: 'Elder Bai',
          role: 'Mentor',
          description: 'A frost-robed sect elder.',
          relationshipToMC: 'Mentor',
          status: 'alive',
          imageAssetId: 'asset-elder',
          imageUrl: 'https://media.example/elder.png',
          imageHistory: [
            {
              id: 'hist-elder',
              assetId: 'asset-elder',
              entityId: 'char-1',
              entityType: 'character',
              imageUrl: 'https://media.example/elder.png',
              promptUsed: 'Elder Bai. A frost-robed sect elder.',
              createdAt: '2026-07-20T00:00:00.000Z',
              isCurrent: true,
            },
          ],
        },
      ],
    } as unknown as StoryMemory;

    // Exactly what PostgreSQL returns: the cover, and nothing else.
    const story = buildStory({
      memory,
      coverAssetId: 'asset-cover',
      imageUrl: 'https://media.example/cover.png',
      imageHistory: [
        {
          id: 'hist-cover',
          assetId: 'asset-cover',
          entityId: 'story-1',
          entityType: 'cover',
          imageUrl: 'https://media.example/cover.png',
          promptUsed: 'Cover image.',
          createdAt: '2026-07-25T00:00:00.000Z',
          isCurrent: true,
        },
      ],
    });

    renderCollage(story);

    expect(screen.getByAltText('Elder Bai')).toHaveProperty(
      'src',
      'https://media.example/elder.png',
    );
    expect(screen.getByAltText(story.title)).toHaveProperty(
      'src',
      'https://media.example/cover.png',
    );
    expect(screen.getByText('All Memories (2)')).toBeDefined();
    expect(screen.getByText('Aura Portraits (2)')).toBeDefined();
  });

  it('counts one memory per asset when the entity and its history share it', () => {
    const memory: StoryMemory = {
      ...baseMemory,
      artifacts: [
        {
          id: 'relic-1',
          name: 'Nine Petal Blade',
          description: 'A blade that remembers every cut.',
          tier: 'Heaven',
          imageAssetId: 'asset-relic',
          imageUrl: 'https://media.example/relic.png',
          imageHistory: [
            {
              id: 'hist-relic',
              assetId: 'asset-relic',
              entityId: 'relic-1',
              entityType: 'artifact',
              imageUrl: 'https://media.example/relic.png',
              promptUsed: 'Nine Petal Blade.',
              createdAt: '2026-07-21T00:00:00.000Z',
              isCurrent: true,
            },
          ],
        },
      ],
    } as unknown as StoryMemory;

    renderCollage(buildStory({ memory }));

    expect(screen.getAllByAltText('Nine Petal Blade')).toHaveLength(1);
    expect(screen.getByText('All Memories (1)')).toBeDefined();
  });

  it('renders chapter hero images as scene memories', () => {
    const story = buildStory({
      arcs: [
        {
          title: 'Arc I: The Falling Sect',
          isCompleted: false,
          chapters: [
            {
              number: 2,
              title: 'Ash on the Steps',
              summary: 'The sect gates burn.',
              heroImageAssetId: 'asset-hero-2',
              assetManifest: { heroImage: 'https://media.example/hero-2.png' },
            },
          ],
        },
      ],
    } as unknown as Partial<StoryWorld>);

    renderCollage(story);

    expect(screen.getByAltText('Chapter 2: Ash on the Steps')).toHaveProperty(
      'src',
      'https://media.example/hero-2.png',
    );
    expect(screen.getByText('Scene Cruxes (1)')).toBeDefined();
  });

  it('shows a placeholder, never a broken image, for an unresolved delivery URL', () => {
    // The cloud hands back an asset id with an empty delivery URL whenever the
    // signed link could not be minted. A bare <img src=""> rendered the
    // browser's broken-image glyph, which reads to the user as lost data.
    const story = buildStory({
      coverAssetId: 'asset-cover',
      imageHistory: [
        {
          id: 'hist-cover',
          assetId: 'asset-cover',
          entityId: 'story-1',
          entityType: 'cover',
          imageUrl: '',
          promptUsed: 'Cover image.',
          createdAt: '2026-07-25T00:00:00.000Z',
          isCurrent: true,
        },
      ],
    });

    renderCollage(story);

    expect(screen.queryByAltText(story.title)).toBeNull();
    expect(screen.getByText('Aura Resealing')).toBeDefined();
    expect(screen.getByText('All Memories (1)')).toBeDefined();
  });

  it('reports an empty album when the story carries no manifestations', () => {
    renderCollage(buildStory());

    expect(screen.getByText('Chronicle Album Empty')).toBeDefined();
    expect(screen.getByText('All Memories (0)')).toBeDefined();
  });
});
