import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileStoriesPanel } from './UserProfileStoriesPanel';

const mocks = vi.hoisted(() => ({
  listStorySeeds: vi.fn(),
  downloadStorySeed: vi.fn(),
  downloadStorySeedCollection: vi.fn(),
}));

vi.mock('../lib/storySeedStorage', () => ({
  listStorySeeds: mocks.listStorySeeds,
}));

vi.mock('../lib/storySeedFormat', () => ({
  downloadStorySeed: mocks.downloadStorySeed,
  downloadStorySeedCollection: mocks.downloadStorySeedCollection,
}));

const seed = {
  schemaVersion: 1 as const,
  id: 'seed-1',
  userId: 'reader-1',
  title: 'The Jade Gate',
  intake: { novelTitle: 'The Jade Gate' },
  blueprint: {
    title: 'The Jade Gate',
    logline: '',
    worldOverview: '',
    startingLocation: '',
    societyStructure: '',
    powerSystemOutline: '',
    mcProfile: '',
    majorFactions: [],
    initialCharacters: [],
    majorMysteries: [],
    firstArcPromise: '',
    tropeRules: '',
    styleBible: '',
    estimatedArcs: 5,
    unresolvedPlotThreads: [],
  },
  createdAt: '2026-07-21T12:00:00.000Z',
  updatedAt: '2026-07-21T12:00:00.000Z',
};
const legacySeed = { ...seed, updatedAt: undefined } as any;

describe('UserProfileStoriesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listStorySeeds.mockResolvedValue([legacySeed]);
    mocks.downloadStorySeed.mockResolvedValue(undefined);
    mocks.downloadStorySeedCollection.mockResolvedValue(undefined);
  });

  it('replaces sealed flows with a documented account seed index and export controls', async () => {
    render(
      <UserProfileStoriesPanel
        profile={{ inactiveStories: ['story-sealed'] } as any}
        currentUser={{ uid: 'reader-1' } as any}
        stories={[
          { id: 'story-1', userId: 'reader-1', title: 'Active Realm' } as any,
          { id: 'story-deleted', userId: 'reader-1', title: 'Deleted Realm', deleted: true } as any,
        ]}
      />,
    );

    expect(await screen.findByText('The Jade Gate')).toBeDefined();
    expect(screen.getByText('Story Seeds')).toBeDefined();
    expect(screen.queryByText('Sealed Flows')).toBeNull();
    expect(screen.getByText('Active Realm')).toBeDefined();
    expect(screen.queryByText('Deleted Realm')).toBeNull();
    expect(screen.getByText(/deleting a story does not delete its seed/i)).toBeDefined();
    expect(screen.getByText(`Updated ${new Intl.DateTimeFormat().format(new Date(seed.createdAt))}`)).toBeDefined();
    expect(screen.queryByText(/Invalid Date/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Export The Jade Gate seed' }));
    expect(mocks.downloadStorySeed).toHaveBeenCalledWith(legacySeed);

    fireEvent.click(screen.getByRole('button', { name: 'Export All Seed JSON' }));
    expect(mocks.downloadStorySeedCollection).toHaveBeenCalledWith([legacySeed]);
  });

  it('keeps the profile usable when the seed index cannot be loaded', async () => {
    mocks.listStorySeeds.mockRejectedValue(new Error('permission denied'));
    render(
      <UserProfileStoriesPanel
        profile={null}
        currentUser={{ uid: 'reader-1' } as any}
        stories={[]}
      />,
    );

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByText(/stories and embedded seed data are unchanged/i)).toBeDefined();
    expect(screen.getByText('No account seeds indexed yet.')).toBeDefined();
  });
});
