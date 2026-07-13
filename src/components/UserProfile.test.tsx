import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
  const renderProfile = () => render(
    <UserProfile
      currentUser={{ uid: '123' } as any}
      stories={[]}
      onLogout={vi.fn()}
      onNavigateHome={vi.fn()}
    />
  );

  it('renders without crashing', () => {
    const { container } = renderProfile();
    expect(container).toBeDefined();
  });

  it('exposes one Harmony control without manual sync modes or audit tools', () => {
    renderProfile();

    fireEvent.click(screen.getByRole('button', { name: /advanced tools/i }));

    expect(screen.getByRole('button', { name: /harmony: automatic/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /store only on this device|device-only storage/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /audit sync/i })).toBeNull();
    expect(screen.queryByText(/sync diagnostic/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /cloud recovery/i })).toBeNull();
  });
});
