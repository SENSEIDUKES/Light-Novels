/**
 * Journey: the Reader Chamber renders the immersion surface correctly for a
 * chapter that was actually round-tripped through PostgreSQL.
 *
 * The chapter is not a hand-made prop object: it is saved through the real
 * persistence stack, read back on a fresh device, and merged into the reader's
 * chapter shape exactly as `ReaderScreen.buildReaderChapters` does. The app
 * store is the real store, so immersion and audio-mix state are genuine.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/firebase', async () => (await import('../support/testAuth')).firebaseModuleMock());
vi.mock('firebase/auth', async () => (await import('../support/testAuth')).firebaseAuthModuleMock());
vi.mock('../../generated/dataconnect-admin', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  const { createDataConnectAdminMock } = await import('../support/dataConnectAdminMock');
  return createDataConnectAdminMock(actual);
});

import { cleanup, render, screen, within } from '@testing-library/react';
import ReaderChamber from '../../components/ReaderChamber';
import { getAudioMixSettings, isChannelAudible } from '../../lib/audio/audioMixSettings';
import { SYSTEM_LEGEND_DISMISSED_STORAGE_KEY } from '../../lib/readerLegend';
import { SYSTEM_COLORS_LEGEND, getSystemColorMeaning } from '../../lib/systemColors';
import { useAppStore } from '../../store/useAppStore';
import type { Chapter, ChapterContent, StoryWorld } from '../../types';
import {
  createCelestialHarness,
  flushMicrotasks,
  resetCelestialWorld,
  stopCelestialServer,
  type CelestialHarness,
} from '../support/celestialHarness';
import {
  JOURNEY_UID,
  STORY_ID,
  makeChapterContent,
  makeStory,
} from '../support/journeyFixtures';

let harness: CelestialHarness;

beforeEach(async () => {
  resetCelestialWorld();
  window.IntersectionObserver = vi.fn().mockImplementation(function IntersectionObserverStub() {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  }) as unknown as typeof IntersectionObserver;
  harness = await createCelestialHarness();
  await harness.signIn(JOURNEY_UID, 'reader@example.com');
});

afterEach(async () => {
  // Unmount while the account is still signed in, then let the reader's
  // position flush settle before the manager goes away.
  cleanup();
  await flushMicrotasks();
  useAppStore.setState({ stories: [], activeStoryId: null });
  await harness.dispose();
});

afterAll(async () => {
  await stopCelestialServer();
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Mirror of `ReaderScreen.buildReaderChapters` for one cached chapter. */
function buildReaderChapters(story: StoryWorld, cached: ChapterContent): Chapter[] {
  return story.arcs
    .flatMap((arc) => arc.chapters)
    .map((chapter) =>
      chapter.number === cached.chapterNumber
        ? {
            ...chapter,
            generatedContent: cached.generatedContent,
            blocks: cached.blocks,
            summary: cached.summary ?? chapter.summary,
            statsChangeMessage: cached.statsChangeMessage ?? chapter.statsChangeMessage,
            cuePayload: cached.cuePayload ?? chapter.cuePayload,
          }
        : chapter,
    );
}

/** Persist a story and chapter, then read both back from the cloud. */
async function loadRoundTrippedChapter(): Promise<{
  story: StoryWorld;
  chapters: Chapter[];
}> {
  await harness.storage.saveStory(makeStory());
  await harness.storage.saveChapterContent(makeChapterContent());
  await harness.sync();

  const fresh = await harness.newDevice();
  await harness.signIn(JOURNEY_UID, 'reader@example.com');
  const story = await fresh.getStory(STORY_ID);
  const content = await fresh.getChapterContent(STORY_ID, 2);
  if (!story || !content) throw new Error('The round-tripped chapter was not readable.');

  useAppStore.setState({ stories: [story], activeStoryId: story.id });
  return { story, chapters: buildReaderChapters(story, content) };
}

function renderChamber(story: StoryWorld, chapters: Chapter[]) {
  return render(
    <ReaderChamber
      chapters={chapters}
      currentPowerStage={story.memory.currentPowerStage}
      selectedChapterNum={2}
      setSelectedChapterNum={vi.fn()}
      onGenerateChapter={vi.fn()}
      onGenerateNextFiveChapters={vi.fn()}
      isGenerating={false}
      onToggleRead={vi.fn()}
      arcTitle={story.arcs[0].title}
      onSwitchTab={vi.fn()}
      activeStory={story}
      updateStoryFields={vi.fn()}
    />,
  );
}

describe('Reader Chamber immersion journey', () => {
  it('renders the round-tripped prose, dialogue and speaker attribution', async () => {
    const { story, chapters } = await loadRoundTrippedChapter();
    const { container } = renderChamber(story, chapters);

    // Codex highlighting splits prose across elements, so read the rendered
    // text as the reader sees it rather than as single text nodes.
    const rendered = container.textContent ?? '';
    expect(rendered).toContain('azure gate hummed with ancient power');
    expect(rendered).toContain('You audit the heavens with a borrowed brush');
    // The dialogue speaker survived persistence and is attributed on screen.
    expect(screen.getAllByText(/Elder Kang/i).length).toBeGreaterThan(0);
  });

  it('colours a Codex name inside the prose rather than rendering plain text', async () => {
    const { story, chapters } = await loadRoundTrippedChapter();
    const { container } = renderChamber(story, chapters);

    // `createCodexHighlighter` wraps known entity names in their own element.
    const highlighted = Array.from(container.querySelectorAll('span, button, mark')).filter(
      (element) => element.textContent?.trim() === 'Lin Shuye',
    );
    expect(highlighted.length).toBeGreaterThan(0);
    const styled = highlighted.some(
      (element) => element.className.length > 0 || element.getAttribute('style'),
    );
    expect(styled).toBe(true);
  });

  it('renders the system event with its declared category palette, not the neutral default', async () => {
    const { story, chapters } = await loadRoundTrippedChapter();
    const { container } = renderChamber(story, chapters);

    expect(screen.getByText('Realm Ascension')).toBeTruthy();
    expect(screen.getByText('Foundation Establishment')).toBeTruthy();

    // The breakthrough palette must be the one applied, and it must differ from
    // the neutral fallback an unclassified event would receive.
    const breakthrough = getSystemColorMeaning('breakthrough');
    const neutral = getSystemColorMeaning('neutral');
    expect(breakthrough.borderColor).not.toBe(neutral.borderColor);

    let panel: HTMLElement | null = screen.getByText('Realm Ascension');
    while (panel && !panel.className.includes(breakthrough.borderColor)) {
      panel = panel.parentElement;
    }
    expect(panel).not.toBeNull();
    expect(panel!.className).toContain(breakthrough.bgColor);
    expect(panel!.className).not.toContain(neutral.borderColor);
    // The legend caption names the same category the block was classified as.
    expect(
      screen.getAllByText(new RegExp(escapeRegExp(breakthrough.name))).length,
    ).toBeGreaterThan(0);
  });

  it('renders the world card that accompanied the chapter body', async () => {
    const { story, chapters } = await loadRoundTrippedChapter();
    renderChamber(story, chapters);

    const cards = screen.getAllByText('Ledger of Names');
    expect(cards.length).toBeGreaterThan(0);
    expect(screen.getByText(/Every debt owed to heaven is written here/i)).toBeTruthy();
  });

  it('exposes the reader audio and immersion state the chamber renders against', async () => {
    const { story, chapters } = await loadRoundTrippedChapter();
    renderChamber(story, chapters);

    const state = useAppStore.getState();
    // The real store, not a stub: immersion state must be defined so the
    // chamber's popups, auto-scroll and cue gating have something to read.
    expect(state.immersion).toBeTruthy();
    expect(typeof state.immersion.master).toBe('boolean');
    expect(typeof state.readerMode).toBe('string');

    // The real audio mix backs every channel the chamber can play through.
    const mix = getAudioMixSettings();
    for (const channel of ['master', 'music', 'atmosphere', 'cues'] as const) {
      expect(typeof mix[channel].volume).toBe('number');
      expect(typeof mix[channel].enabled).toBe('boolean');
    }
    expect(isChannelAudible('cues', mix)).toBe(
      mix.master.enabled && mix.cues.enabled && mix.master.volume > 0 && mix.cues.volume > 0,
    );

    // The persisted cue payload is what selects the scene bed.
    const chapter = chapters.find((entry) => entry.number === 2);
    expect(chapter?.cuePayload?.atmosphereCategory).toBe('wind');
    expect(chapter?.blocks?.[0].metadata?.music?.mood).toBe('travel');
  });

  it('shows the system colour legend while the chapter carries system blocks', async () => {
    localStorage.removeItem(SYSTEM_LEGEND_DISMISSED_STORAGE_KEY);
    const { story, chapters } = await loadRoundTrippedChapter();
    renderChamber(story, chapters);

    const chapter = chapters.find((entry) => entry.number === 2);
    expect(chapter?.blocks?.some((block) => Boolean(block.system))).toBe(true);

    // The legend itself, not merely the system block it explains.
    const legend = screen.getByRole('region', { name: 'Aetherial System Codes' });
    expect(within(legend).getByText('Dismiss')).toBeTruthy();
    // Every classification the reader can encounter is described in it.
    for (const meaning of SYSTEM_COLORS_LEGEND) {
      expect(
        within(legend).getAllByText(
          new RegExp(escapeRegExp(meaning.name)),
        ).length,
      ).toBeGreaterThan(0);
    }
  });
});
