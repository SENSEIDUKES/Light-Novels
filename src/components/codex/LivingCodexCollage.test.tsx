import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('does not lend the current portrait to an older version that has no asset id', () => {
    // `img.assetId === entry.imageAssetId` was true for two `undefined`s, so a
    // legacy history entry adopted the entity's live image and rendered it
    // under an older version's prompt and date.
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
          imageUrl: 'https://media.example/current.png',
          imageHistory: [
            {
              id: 'hist-legacy',
              entityId: 'char-1',
              entityType: 'character',
              imageUrl: '',
              promptUsed: 'An older, superseded rendering.',
              createdAt: '2026-07-02T00:00:00.000Z',
              isCurrent: false,
            },
          ],
        },
      ],
    } as unknown as StoryMemory;

    renderCollage(buildStory({ memory }));

    // The superseded version carries no asset id and no URL of its own, so it
    // contributes nothing. What it must never do is borrow the live portrait
    // and present it as that older memory — so the one tile that renders has
    // to be the entity's current manifestation, not the stale history entry.
    const rendered = screen.getAllByAltText('Elder Bai');
    expect(rendered).toHaveLength(1);
    expect(rendered[0]).toHaveProperty('src', 'https://media.example/current.png');

    fireEvent.click(rendered[0]);
    expect(screen.queryByText('An older, superseded rendering.')).toBeNull();
  });

  it('still lends the current portrait to the version that shares its asset id', () => {
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
          imageAssetId: 'asset-current',
          imageUrl: 'https://media.example/current.png',
          imageHistory: [
            {
              id: 'hist-current',
              assetId: 'asset-current',
              entityId: 'char-1',
              entityType: 'character',
              imageUrl: '',
              promptUsed: 'The live rendering.',
              createdAt: '2026-07-20T00:00:00.000Z',
              isCurrent: true,
            },
          ],
        },
      ],
    } as unknown as StoryMemory;

    renderCollage(buildStory({ memory }));

    expect(screen.getByAltText('Elder Bai')).toHaveProperty(
      'src',
      'https://media.example/current.png',
    );
    expect(screen.queryByText('Aura Resealing')).toBeNull();
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

  it('uses chapter-owned hero history and ignores stale non-cover story history', () => {
    const story = buildStory({
      imageHistory: [{
        id: 'stale-character-copy',
        assetId: 'asset-stale-character',
        entityId: 'char-ghost',
        entityType: 'character',
        imageUrl: 'https://media.example/should-not-render.png',
        promptUsed: 'A stale root copy.',
        createdAt: '2026-07-20T00:00:00.000Z',
        isCurrent: false,
      }],
      arcs: [{
        title: 'Arc I: The Falling Sect',
        isCompleted: false,
        chapters: [{
          number: 2,
          title: 'Ash on the Steps',
          premise: 'The gates burn.',
          status: 'read',
          heroImageAssetId: 'asset-hero-current',
          assetManifest: { heroImage: 'https://media.example/hero-current.png' },
          imageHistory: [{
            id: 'hero-before',
            assetId: 'asset-hero-before',
            entityId: 'chapter-2',
            entityType: 'chapterHero',
            imageUrl: 'https://media.example/hero-before.png',
            promptUsed: 'Before the gates burned.',
            createdAt: '2026-07-20T00:00:00.000Z',
            isCurrent: false,
            chapterNumber: 2,
          }, {
            id: 'hero-current',
            assetId: 'asset-hero-current',
            entityId: 'chapter-2',
            entityType: 'chapterHero',
            imageUrl: '',
            promptUsed: 'The burning gates.',
            createdAt: '2026-07-21T00:00:00.000Z',
            isCurrent: true,
            chapterNumber: 2,
          }],
        }],
      }],
    } as unknown as Partial<StoryWorld>);

    renderCollage(story);

    expect(screen.getAllByAltText('Chapter 2: Ash on the Steps')).toHaveLength(2);
    expect(screen.getByText('All Memories (2)')).toBeDefined();
    expect(screen.queryByAltText('Unknown Character')).toBeNull();
  });

  it('ignores malformed legacy history containers without breaking valid memories', () => {
    const story = buildStory({
      imageHistory: { stale: true } as unknown as StoryWorld['imageHistory'],
      arcs: [
        {
          title: 'Malformed Arc',
          isCompleted: false,
          chapters: { stale: true } as unknown as StoryWorld['arcs'][number]['chapters'],
        },
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
              imageHistory: { stale: true } as unknown as NonNullable<StoryWorld['arcs'][number]['chapters'][number]['imageHistory']>,
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
    expect(screen.getByText('All Memories (1)')).toBeDefined();
  });

  it('treats a non-array arc container as an empty album', () => {
    const story = buildStory({
      arcs: { stale: true } as unknown as StoryWorld['arcs'],
    });

    renderCollage(story);

    expect(screen.getByText('Chronicle Album Empty')).toBeDefined();
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
