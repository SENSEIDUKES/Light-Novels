import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreationPortal from './CreationPortal';

const mocks = vi.hoisted(() => ({
  state: {
    isGenerating: false,
    activeAgentId: null,
    currentUser: { uid: 'reader-1' },
    stories: [],
  },
  createStorySeed: vi.fn(),
  updateStorySeed: vi.fn(),
  importStorySeeds: vi.fn(),
  listStorySeeds: vi.fn(),
  downloadStorySeed: vi.fn(),
  downloadStorySeedCollection: vi.fn(),
}));

vi.mock('../store/useAppStore', () => {
  const useAppStore = (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state);
  useAppStore.getState = () => mocks.state;
  return { useAppStore };
});

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'reader-1' } },
  LOCAL_ONLY_MODE: false,
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}));

vi.mock('../lib/storySeedStorage', () => ({
  createStorySeed: mocks.createStorySeed,
  updateStorySeed: mocks.updateStorySeed,
  importStorySeeds: mocks.importStorySeeds,
  listStorySeeds: mocks.listStorySeeds,
}));

vi.mock('../lib/storySeedFormat', () => ({
  downloadStorySeed: mocks.downloadStorySeed,
  downloadStorySeedCollection: mocks.downloadStorySeedCollection,
  parseStorySeedJson: vi.fn(),
}));

const blueprint = {
  title: 'The Jade Gate',
  logline: 'A sealed gate awakens.',
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
};

const savedSeed = {
  schemaVersion: 1 as const,
  id: 'seed-1',
  userId: 'reader-1',
  title: blueprint.title,
  intake: { corePremise: 'A sealed gate awakens.', genrePath: 'Xianxia' },
  blueprint,
  createdAt: '2026-07-21T12:00:00.000Z',
  updatedAt: '2026-07-21T12:00:00.000Z',
};

describe('CreationPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.isGenerating = false;
    mocks.listStorySeeds.mockResolvedValue([]);
    mocks.createStorySeed.mockResolvedValue(savedSeed);
    mocks.updateStorySeed.mockResolvedValue(savedSeed);
    mocks.importStorySeeds.mockResolvedValue([savedSeed]);
    mocks.downloadStorySeed.mockResolvedValue(undefined);
    mocks.downloadStorySeedCollection.mockResolvedValue(undefined);
  });

  it('renders the account seed library without adding a major navigation surface', async () => {
    mocks.listStorySeeds.mockResolvedValue([savedSeed]);
    render(
      <CreationPortal
        onStartStory={vi.fn()}
        onGenerateBlueprint={vi.fn()}
        isGenerating={false}
        error={null}
      />,
    );

    expect(await screen.findByText('My Story Seeds')).toBeDefined();
    expect(await screen.findByText('The Jade Gate')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Export All Seeds' }));
    expect(mocks.downloadStorySeedCollection).toHaveBeenCalledWith([savedSeed]);
  });

  it('saves the seed first and passes its account ID into the generated story', async () => {
    const onGenerateBlueprint = vi.fn().mockResolvedValue(blueprint);
    const onStartStory = vi.fn().mockResolvedValue(undefined);
    render(
      <CreationPortal
        onStartStory={onStartStory}
        onGenerateBlueprint={onGenerateBlueprint}
        isGenerating={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forge World Blueprint' }));
    expect(await screen.findByDisplayValue('The Jade Gate')).toBeDefined();
    await waitFor(() => expect(mocks.createStorySeed).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: 'Accept Blueprint & Start Matrix' }));
    await waitFor(() => expect(onStartStory).toHaveBeenCalledOnce());
    expect(mocks.updateStorySeed).toHaveBeenCalledWith(
      savedSeed,
      expect.objectContaining({ blueprint: expect.objectContaining({ title: 'The Jade Gate' }) }),
    );
    expect(onStartStory.mock.calls[0][3]).toBe('seed-1');
  });
});
