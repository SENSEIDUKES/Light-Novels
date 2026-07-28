import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { ModalsAndToasts } from './ModalsAndToasts';

const { useAppStoreMock } = vi.hoisted(() => {
  const state = {
    authModalOpen: false,
    setAuthModalOpen: vi.fn(),
    quotaModalOpen: false,
    setQuotaModalOpen: vi.fn(),
    isSettingsOpen: false,
    setIsSettingsOpen: vi.fn(),
    storageType: 'indexeddb',
    setStorageType: vi.fn(),
    localGeminiKey: '',
    setLocalGeminiKey: vi.fn(),
    localOpenrouterKey: '',
    setLocalOpenrouterKey: vi.fn(),
    localOllamaHost: '',
    setLocalOllamaHost: vi.fn(),
    readerMode: 'zen',
    setReaderMode: vi.fn(),
    themeMode: 'dark',
    setThemeMode: vi.fn(),
    currentScreen: 'home',
    canShowRelicInReader: true,
    pendingRelicQueue: [],
    enqueueRelicReveal: vi.fn(),
    popPendingRelic: vi.fn(() => null),
    setCanShowRelicInReader: vi.fn(),
    routingConfig: {
      storyMaker: { provider: 'google' },
      imageGenerator: { provider: 'google' }
    },
    setRoutingConfig: vi.fn()
  };
  const mock: any = (selector?: any) => selector ? selector(state) : state;
  mock.setState = vi.fn();
  mock.getState = () => state;
  return { useAppStoreMock: mock };
});

vi.mock('../store/useAppStore', () => ({
  useAppStore: useAppStoreMock
}));

describe('ModalsAndToasts', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ModalsAndToasts />
    );
    expect(container).toBeDefined();
  });
});

describe('Relic reveal — rarity ranks', () => {
  const ALL_RARITIES = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Transcendent'] as const;

  const revealArtifact = async (rarity: string) => {
    const utils = render(<ModalsAndToasts />);
    act(() => {
      window.dispatchEvent(new CustomEvent('seihouse-artifact-unlocked', {
        detail: {
          artifact: {
            id: `art-${rarity}`,
            name: `${rarity} Test Relic`,
            description: 'A relic used to verify rank rendering.',
            rarity,
            rewardValueQi: 100,
          }
        }
      }));
    });
    // Wait past the 3s mystery-card reveal timer.
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    return utils;
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(ALL_RARITIES.map(r => [r]))('produces and renders a %s relic with compact reward boxes', async (rarity) => {
    const { getByText, unmount } = await revealArtifact(rarity);

    // Rarity label on the card header
    getByText(`${rarity} Relic`);
    // Compact "VALUE | LABEL" reward boxes (exact match = the box, not the header)
    getByText('+100');
    getByText('QI');
    getByText(rarity, { exact: true });
    getByText('Relic', { exact: true });

    unmount();
  });
});
