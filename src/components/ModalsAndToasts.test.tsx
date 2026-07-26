import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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
