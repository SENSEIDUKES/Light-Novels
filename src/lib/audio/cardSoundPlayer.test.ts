import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { playCardSound, stopCardSound, getCachedCardSound, resetCardSoundCacheForTests } from './cardSoundPlayer';
import { CuratedSoundAsset } from './cardSoundCatalog';

class MockAudio {
  static instances: MockAudio[] = [];
  src: string;
  volume = 1;
  currentTime = 0;
  preload = '';
  paused = true;
  playError: Error | null = null;
  play = vi.fn(() => {
    if (this.playError) return Promise.reject(this.playError);
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  constructor(src: string) {
    this.src = src;
    MockAudio.instances.push(this);
  }
}

const asset: CuratedSoundAsset = {
  id: 'DEFAULT/Beasts/Roar/Giant_Beast_Roar_1.mp3',
  entityTypes: ['creature'],
  role: 'roar',
  category: 'beasts',
  variation: 'roar',
  tags: [],
  sourceTags: [],
  pathTags: [],
  url: 'https://celestialaudio.seihouse.org/DEFAULT/Beasts/Roar/Giant_Beast_Roar_1.mp3',
};

beforeEach(() => {
  MockAudio.instances = [];
  vi.stubGlobal('Audio', MockAudio);
  resetCardSoundCacheForTests();
});

afterEach(() => {
  resetCardSoundCacheForTests();
  vi.unstubAllGlobals();
});

describe('cardSoundPlayer', () => {
  it('plays the curated asset URL', async () => {
    const element = await playCardSound(asset);
    expect(MockAudio.instances).toHaveLength(1);
    expect((element as unknown as MockAudio).src).toBe(asset.url);
    expect(element.play).toHaveBeenCalledTimes(1);
  });

  it('replays the same cached element on repeated taps instead of refetching', async () => {
    const first = await playCardSound(asset);
    const second = await playCardSound(asset);
    expect(second).toBe(first);
    expect(MockAudio.instances).toHaveLength(1);
    expect(first.play).toHaveBeenCalledTimes(2);
    expect(getCachedCardSound(asset.id)).toBe(first);
  });

  it('restarts from the beginning on replay', async () => {
    const element = await playCardSound(asset);
    element.currentTime = 3.2;
    await playCardSound(asset);
    expect(element.currentTime).toBe(0);
  });

  it('applies and clamps the cue volume', async () => {
    const element = await playCardSound(asset, { volume: 0.3 });
    expect(element.volume).toBe(0.3);
    await playCardSound(asset, { volume: 7 });
    expect(element.volume).toBe(1);
    await playCardSound(asset, { volume: -1 });
    expect(element.volume).toBe(0);
  });

  it('propagates playback rejection and evicts the failed element from the cache', async () => {
    const rejection = new Error('NotAllowedError');
    // First tap fails (e.g. browser gesture policy or a dead URL)...
    const failing = new MockAudio(asset.url);
    MockAudio.instances = [];
    failing.playError = rejection;
    vi.stubGlobal('Audio', class extends MockAudio {
      constructor(src: string) {
        super(src);
        if (MockAudio.instances.length === 1) this.playError = rejection;
      }
    });

    await expect(playCardSound(asset)).rejects.toThrow('NotAllowedError');
    expect(getCachedCardSound(asset.id)).toBeUndefined();

    // ...the next tap retries with a fresh element instead of a poisoned one.
    const element = await playCardSound(asset);
    expect((element as unknown as MockAudio).src).toBe(asset.url);
    expect(MockAudio.instances).toHaveLength(2);
  });

  it('stopCardSound pauses and rewinds the cached element', async () => {
    const element = await playCardSound(asset);
    element.currentTime = 1.5;
    stopCardSound(asset.id);
    expect(element.pause).toHaveBeenCalled();
    expect(element.currentTime).toBe(0);
  });

  it('stopCardSound is a no-op for assets that never played', () => {
    expect(() => stopCardSound('never.played')).not.toThrow();
  });
});
