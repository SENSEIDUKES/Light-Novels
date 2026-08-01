import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreationModal from './CreationModal';
import { hasReducedMotionListener, prefersReducedMotion } from 'motion-dom';

const mocks = vi.hoisted(() => ({
  state: {
    activeGenerationRun: null,
    activeAgentId: null,
    currentUser: { uid: 'reader-1' } as { uid: string } | null,
    stories: [],
  },
  auth: { currentUser: { uid: 'reader-1' } as { uid: string } | null },
  signInWithPopup: vi.fn(),
  googleAuthProvider: vi.fn(),
  oAuthProvider: vi.fn(function (this: { addScope?: unknown }) {
    this.addScope = vi.fn();
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
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
  auth: mocks.auth,
  LOCAL_ONLY_MODE: false,
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: mocks.googleAuthProvider,
  OAuthProvider: mocks.oAuthProvider,
  signInWithPopup: mocks.signInWithPopup,
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
}));

const BACKDROP_IMAGE_URL =
  'https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/images/LIBRARY%20BACKDROPS/Library%20Auth%20(Backdrop).png';

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

describe('CreationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // motion's useReducedMotion memoizes the media query globally; reset it so
    // each test re-initializes from the matchMedia stub below.
    hasReducedMotionListener.current = false;
    prefersReducedMotion.current = false;
    mocks.state.activeGenerationRun = null;
    mocks.state.currentUser = { uid: 'reader-1' };
    mocks.auth.currentUser = { uid: 'reader-1' };
    mocks.listStorySeeds.mockResolvedValue([]);
    mocks.createStorySeed.mockResolvedValue(savedSeed);
    mocks.updateStorySeed.mockResolvedValue(savedSeed);
    mocks.importStorySeeds.mockResolvedValue([savedSeed]);
    mocks.downloadStorySeed.mockResolvedValue(undefined);
    mocks.downloadStorySeedCollection.mockResolvedValue(undefined);
    mocks.signInWithPopup.mockResolvedValue(undefined);
    mocks.signInWithEmailAndPassword.mockResolvedValue(undefined);
    mocks.createUserWithEmailAndPassword.mockResolvedValue(undefined);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it('renders the account seed library without adding a major navigation surface', async () => {
    mocks.listStorySeeds.mockResolvedValue([savedSeed]);
    render(
      <CreationModal
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
  }, 30_000);

  it('saves the seed first and passes its account ID into the generated story', async () => {
    const onGenerateBlueprint = vi.fn().mockResolvedValue(blueprint);
    const onStartStory = vi.fn().mockResolvedValue(undefined);
    render(
      <CreationModal
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
  }, 30_000);

  it('lets a guest complete the seed intake before requesting sign-in to generate', () => {
    mocks.state.currentUser = null;
    mocks.auth.currentUser = null;
    const onGenerateBlueprint = vi.fn();

    render(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={onGenerateBlueprint}
        isGenerating={false}
        error={null}
      />,
    );

    expect(screen.getByText('Story Seed Intake')).toBeDefined();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Forge World Blueprint' }));

    expect(onGenerateBlueprint).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Your Destiny Awaits')).toBeDefined();
    expect(
      screen.getByText('Sign in to preserve this world, begin its first chapter, and return to it from any device.'),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Continue with Email' })).toBeDefined();
    expect(screen.getByText('Your Story Seed will not be lost.')).toBeDefined();
  });

  it('continues the requested blueprint generation after the guest signs in', async () => {
    mocks.state.currentUser = null;
    mocks.auth.currentUser = null;
    const onGenerateBlueprint = vi.fn().mockResolvedValue(blueprint);
    const view = render(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={onGenerateBlueprint}
        isGenerating={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forge World Blueprint' }));
    mocks.state.currentUser = { uid: 'reader-1' };
    mocks.auth.currentUser = { uid: 'reader-1' };
    view.rerender(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={onGenerateBlueprint}
        isGenerating={false}
        error={null}
      />,
    );

    // The gate stays mounted while it dissolves (STORY_AUTH_DISSOLVE_MS), then the resume fires.
    expect(screen.getByRole('dialog')).toBeDefined();
    await waitFor(() => expect(onGenerateBlueprint).toHaveBeenCalledOnce(), { timeout: 4000 });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByDisplayValue('The Jade Gate')).toBeDefined();
  });

  it('signs in with Google from the gate', async () => {
    mocks.state.currentUser = null;
    mocks.auth.currentUser = null;
    render(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={vi.fn()}
        isGenerating={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forge World Blueprint' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(mocks.googleAuthProvider).toHaveBeenCalledOnce();
    await waitFor(() => expect(mocks.signInWithPopup).toHaveBeenCalledOnce());
  });

  it('signs in with Apple from the gate', async () => {
    mocks.state.currentUser = null;
    mocks.auth.currentUser = null;
    render(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={vi.fn()}
        isGenerating={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forge World Blueprint' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Apple' }));

    expect(mocks.oAuthProvider).toHaveBeenCalledWith('apple.com');
    await waitFor(() => expect(mocks.signInWithPopup).toHaveBeenCalledOnce());
  });

  it('supports email sign-in and account creation from the gate', async () => {
    mocks.state.currentUser = null;
    mocks.auth.currentUser = null;
    render(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={vi.fn()}
        isGenerating={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forge World Blueprint' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Email' }));

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'adept@library.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-path-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() =>
      expect(mocks.signInWithEmailAndPassword).toHaveBeenCalledWith(mocks.auth, 'adept@library.test', 'secret-path-1'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'New to the Celestial Library? Create an account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() =>
      expect(mocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(mocks.auth, 'adept@library.test', 'secret-path-1'),
    );
  });

  it('layers an initially hidden backdrop video over a permanent fallback image', () => {
    mocks.state.currentUser = null;
    mocks.auth.currentUser = null;
    const { container } = render(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={vi.fn()}
        isGenerating={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forge World Blueprint' }));

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.autoplay).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.loop).toBe(true);
    expect(video?.playsInline).toBe(true);
    expect(video?.hasAttribute('controls')).toBe(false);
    expect(video?.getAttribute('aria-hidden')).toBe('true');
    expect(video?.getAttribute('poster')).toBe(BACKDROP_IMAGE_URL);
    expect(video?.className).toContain('opacity-0');

    const fallback = container.querySelector('img[alt=""]');
    expect(fallback).not.toBeNull();
    expect(fallback?.getAttribute('src')).toBe(BACKDROP_IMAGE_URL);
  });

  it('keeps the video hidden when it fails to load while the image remains', () => {
    mocks.state.currentUser = null;
    mocks.auth.currentUser = null;
    const { container } = render(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={vi.fn()}
        isGenerating={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forge World Blueprint' }));

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    fireEvent.error(video as Element);
    expect(video?.className).toContain('opacity-0');
    expect(container.querySelector('img[alt=""]')).not.toBeNull();
  });

  it('does not render the video under reduced motion but keeps the image', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    mocks.state.currentUser = null;
    mocks.auth.currentUser = null;
    const { container } = render(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={vi.fn()}
        isGenerating={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forge World Blueprint' }));

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img[alt=""]')).not.toBeNull();
  });

  it('shows a calm error and stays usable when a provider sign-in fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.state.currentUser = null;
    mocks.auth.currentUser = null;
    mocks.signInWithPopup.mockRejectedValueOnce({ code: 'auth/operation-not-allowed' });
    render(
      <CreationModal
        onStartStory={vi.fn()}
        onGenerateBlueprint={vi.fn()}
        isGenerating={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forge World Blueprint' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('This sign-in method is not available yet.');
    expect(screen.getByRole('dialog')).toBeDefined();
    expect((screen.getByRole('button', { name: 'Continue with Google' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
