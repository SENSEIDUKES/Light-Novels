import { CuratedSoundAsset } from './cardSoundCatalog';

/**
 * Playback for curated World Card sounds.
 *
 * Runs on plain HTMLAudioElements created inside the user's tap (the gesture
 * browsers require on desktop and mobile), cached per asset so repeated taps
 * replay the same fetched media instead of re-downloading.
 *
 * Deliberately disconnected from every other audio system: no
 * cinematicEffectGovernor budget, no narrative-cue dispatch, no
 * speechSynthesis calls, no atmosphere/scene-mix engines. A card tap can
 * therefore never spend a chapter's automatic cue budget or interrupt
 * narration.
 */

const cache = new Map<string, HTMLAudioElement>();

export interface CardSoundPlayOptions {
  /** 0..1 gain from the reader's cue-volume control. */
  volume?: number;
}

/**
 * Play (or replay) a curated card sound. Resolves with the element once
 * playback has actually started; rejects on load errors or browser playback
 * rejection so the card can show a visible failure state.
 */
export async function playCardSound(
  asset: CuratedSoundAsset,
  options: CardSoundPlayOptions = {},
): Promise<HTMLAudioElement> {
  let element = cache.get(asset.id);
  if (!element) {
    element = new Audio(asset.url);
    element.preload = 'auto';
    cache.set(asset.id, element);
  }

  element.volume = Math.max(0, Math.min(1, options.volume ?? 1));
  try {
    // Inside the try: seeking can throw on some browsers before metadata
    // loads, and that failure must evict the element just like a play()
    // rejection does.
    element.currentTime = 0;
    await element.play();
  } catch (err) {
    // A failed element (bad URL, decode error) must not poison the cache —
    // the next tap retries a fresh fetch.
    cache.delete(asset.id);
    throw err;
  }
  return element;
}

export function stopCardSound(assetId: string) {
  const element = cache.get(assetId);
  if (!element) return;
  element.pause();
  try {
    element.currentTime = 0;
  } catch {
    // Some browsers throw when seeking a not-yet-loaded element; stopping
    // still succeeded.
  }
}

/** The cached element for an asset, if a tap already fetched it. */
export function getCachedCardSound(assetId: string): HTMLAudioElement | undefined {
  return cache.get(assetId);
}

export function resetCardSoundCacheForTests() {
  cache.forEach((el) => el.pause());
  cache.clear();
}
