import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

const storeMocks = vi.hoisted(() => ({
  updateStory: vi.fn().mockResolvedValue(undefined),
}));

const storeState = {
  syncStatus: 'synced',
  lastSavedTime: null,
  setIsSettingsOpen: vi.fn(),
  handleExportLibrary: vi.fn(),
  handleImportLibrary: vi.fn(),
  storageType: 'indexeddb',
  localGeminiKey: '',
  localOpenrouterKey: '',
  localOllamaHost: '',
  isSettingsOpen: false,
  activeStoryId: 'story-1',
  routingConfig: {},
  setIsShortcutsOpen: vi.fn(),
  updateStory: storeMocks.updateStory,
};

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector?: (state: typeof storeState) => unknown) => (
    selector ? selector(storeState) : storeState
  ),
}));

describe('UserProfile', () => {
  const testStory = {
    id: 'story-1',
    title: 'Engine Test Story',
    userId: '123',
  } as any;

  const renderProfile = (stories: any[] = []) => render(
    <UserProfile
      currentUser={{ uid: '123' } as any}
      stories={stories}
      onLogout={vi.fn()}
      onNavigateHome={vi.fn()}
    />
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = renderProfile();
    expect(container).toBeDefined();
  });

  it('exposes one Harmony control without manual sync modes or audit tools', () => {
    renderProfile();

    fireEvent.click(screen.getByRole('button', { name: /advanced tools/i }));

    expect(screen.getByRole('button', { name: /harmony: press to sync/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /store only on this device|device-only storage/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /audit sync/i })).toBeNull();
    expect(screen.queryByText(/sync diagnostic/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /cloud recovery/i })).toBeNull();
  });

  it('moves the Context Engine v2 toggle into Advanced Tools and persists it for the active story', () => {
    renderProfile([testStory]);

    fireEvent.click(screen.getByRole('button', { name: /advanced tools/i }));

    const contextEngineToggle = screen.getByRole('switch', {
      name: 'Context Engine v2 (experimental)',
    });
    expect(contextEngineToggle.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(contextEngineToggle);

    expect(storeMocks.updateStory).toHaveBeenCalledWith('story-1', {
      readerPreferences: {
        fontSize: 'lg',
        fontFamily: 'serif',
        lineHeight: 'relaxed',
        paragraphSpacing: 'normal',
        themeOverride: 'void',
        contextEngine: 'v2',
      },
    });
  });
});
