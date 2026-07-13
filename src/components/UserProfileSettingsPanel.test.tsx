import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { UserProfileSettingsPanel } from './UserProfileSettingsPanel';

const storageMocks = vi.hoisted(() => ({
  performSync: vi.fn(),
}));

vi.mock('../lib/storage', () => ({
  storyStorage: storageMocks,
}));
vi.mock('../lib/firebase', () => ({
  LOCAL_ONLY_MODE: false,
  setLocalOnlyMode: vi.fn(),
}));

const renderPanel = (syncStatus: string) => render(
  <UserProfileSettingsPanel
    syncStatus={syncStatus}
    lastSavedTime={null}
    formData={{}}
    profile={null}
    handleLanguageChangeDirect={vi.fn()}
  />
);

describe('UserProfileSettingsPanel harmony control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs a manual sync from the single automatic Harmony control', () => {
    renderPanel('synced');

    const harmonyButton = screen.getByRole('button', { name: 'Harmony: Automatic' });
    fireEvent.click(harmonyButton);

    expect(storageMocks.performSync).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Harmony')).toHaveLength(1);
    expect(screen.queryByText(/audit sync/i)).toBeNull();
    expect(screen.queryByText(/dao aligned/i)).toBeNull();
    expect(screen.queryByText(/wipe cloud storage/i)).toBeNull();
  });

  it.each([
    ['offline', 'Offline'],
    ['syncing', 'Harmonizing…'],
    ['error', 'Needs attention'],
  ])('announces the %s Harmony state', (syncStatus, detail) => {
    renderPanel(syncStatus);

    expect(screen.getByRole('button', { name: `Harmony: ${detail}` })).toBeDefined();
  });
});
