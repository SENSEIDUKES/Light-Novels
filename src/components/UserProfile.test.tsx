import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import UserProfile from './UserProfile';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    syncStatus: 'synced',
    lastSavedTime: null,
    setIsSettingsOpen: vi.fn(),
    handleExportLibrary: vi.fn(),
    handleImportLibrary: vi.fn(),
    storageType: 'indexeddb',
    localGeminiKey: '',
    localOpenrouterKey: '',
    localOllamaHost: '',
    isSettingsOpen: false
  })
}));

describe('UserProfile', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <UserProfile 
        currentUser={{ uid: '123' } as any} 
        stories={[]} 
        onLogout={vi.fn()} 
        onNavigateHome={vi.fn()} 
      />
    );
    expect(container).toBeDefined();
  });
});
