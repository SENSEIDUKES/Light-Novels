import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ModalsAndToasts } from './ModalsAndToasts';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
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
    routingConfig: {},
    setRoutingConfig: vi.fn()
  })
}));

describe('ModalsAndToasts', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ModalsAndToasts />
    );
    expect(container).toBeDefined();
  });
});
