import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryScreen } from './LibraryScreen';

const state = vi.hoisted(() => ({
  current: {
    currentScreen: 'home',
    setCurrentScreen: vi.fn(),
    stories: [] as any[],
    setActiveStoryId: vi.fn(),
    setStoryToDelete: vi.fn(),
    userProfile: { qi: 0 },
    syncStatus: 'synced' as string,
  },
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: any) => selector(state.current),
}));

function makeStory(id: string, title: string) {
  return {
    id,
    title,
    genre: 'Xianxia',
    mcName: 'Hero',
    updatedAt: '2026-07-01T00:00:00.000Z',
    memory: { currentPowerStage: 'Novice stage' },
    arcs: [{
      title: 'Arc',
      chapters: [{ number: 1, title: 'One', status: 'unread', hasContent: true, isSealed: true }],
    }],
  };
}

const openMyLibrary = () =>
  fireEvent.click(screen.getByRole('button', { name: /My Library/ }));

describe('LibraryScreen while Harmony is still retrieving the catalog', () => {
  beforeEach(() => {
    state.current = { ...state.current, stories: [], syncStatus: 'synced' };
  });

  it('shows a retrieval state instead of "No Stories Found" while the catalog is in flight', () => {
    // Signing in clears the rendered library so one account's stories can never
    // survive into the next. The store is therefore legitimately empty while
    // Harmony fetches the catalog, and that is not "you have no stories".
    state.current = { ...state.current, stories: [], syncStatus: 'syncing' };

    render(<LibraryScreen />);
    openMyLibrary();

    expect(screen.getByText('Opening the Story Vault')).toBeDefined();
    expect(screen.queryByText('No Stories Found')).toBeNull();
  });

  it('still reports a genuinely empty library once Harmony has settled', () => {
    state.current = { ...state.current, stories: [], syncStatus: 'synced' };

    render(<LibraryScreen />);
    openMyLibrary();

    expect(screen.getByText('No Stories Found')).toBeDefined();
    expect(screen.queryByText('Opening the Story Vault')).toBeNull();
  });

  it('reveals My Library when the catalog arrives after the screen has mounted', () => {
    // The library is published as Harmony reconciles it rather than before the
    // first paint, so this screen can mount with an empty store and be handed
    // its stories a moment later. It must not leave the reader on Immortal Hub.
    state.current = { ...state.current, stories: [], syncStatus: 'syncing' };
    const { rerender } = render(<LibraryScreen />);
    expect(screen.queryByRole('button', { name: 'View story Ashen Sovereign' })).toBeNull();

    state.current = {
      ...state.current,
      stories: [makeStory('story-1', 'Ashen Sovereign')],
      syncStatus: 'synced',
    };
    rerender(<LibraryScreen />);

    // The real card, with its metadata — not a placeholder.
    expect(screen.getByRole('button', { name: 'View story Ashen Sovereign' })).toBeDefined();
    expect(screen.getAllByText('MC: Hero • Novice stage').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Xianxia').length).toBeGreaterThan(0);
  });

  it('keeps the reader on a tab they chose themselves when the catalog lands', () => {
    state.current = { ...state.current, stories: [], syncStatus: 'syncing' };
    const { rerender } = render(<LibraryScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Immortal Hub' }));

    state.current = {
      ...state.current,
      stories: [makeStory('story-1', 'Ashen Sovereign')],
      syncStatus: 'synced',
    };
    rerender(<LibraryScreen />);

    expect(screen.queryByRole('button', { name: 'View story Ashen Sovereign' })).toBeNull();
    expect(screen.getByText(
      'Curated worlds will return after their chapters are published to the current library format.',
    )).toBeDefined();
  });
});
