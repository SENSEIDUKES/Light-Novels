import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  CARD_SOUND_LIBRARY,
  resolveCardSound,
  resolveCardSoundRole,
  setUnresolvedCardSoundListener,
} from './cardSoundCatalog';
import { WorldCardEvent, WorldCardSoundRole } from '../../types';

const makeCard = (overrides: Partial<WorldCardEvent>): WorldCardEvent => ({
  entityType: 'creature',
  entityName: 'Test Entity',
  displayTitle: 'Test Entity',
  audioType: 'roar',
  ...overrides,
});

afterEach(() => {
  setUnresolvedCardSoundListener(null);
});

describe('CARD_SOUND_LIBRARY', () => {
  it('contains only unique semantic ids', () => {
    const ids = CARD_SOUND_LIBRARY.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only carries valid curated asset URLs', () => {
    for (const asset of CARD_SOUND_LIBRARY) {
      expect(() => new URL(asset.url)).not.toThrow();
      expect(asset.url).toMatch(/^https:\/\//);
      expect(asset.url).toMatch(/\.(mp3|wav|ogg)$/);
    }
  });
});

describe('resolveCardSound — role coverage', () => {
  // Every supported sound role must resolve to a curated asset for a plain
  // card of the matching entity type — the catalog guarantees a generic
  // fallback per role.
  const roleFixtures: Array<[WorldCardSoundRole, WorldCardEvent['entityType']]> = [
    ['roar', 'creature'],
    ['call', 'creature'],
    ['hiss', 'creature'],
    ['howl', 'creature'],
    ['screech', 'creature'],
    ['wingbeat', 'creature'],
    ['unsheathe', 'artifact'],
    ['metallic_ring', 'artifact'],
    ['swing', 'artifact'],
    ['impact', 'artifact'],
    ['activation_hum', 'artifact'],
    ['resonance', 'artifact'],
    ['awakening', 'artifact'],
    ['pulse', 'artifact'],
    ['magical_activation', 'artifact'],
    ['ambience', 'location'],
    ['signature', 'location'],
    ['chant', 'faction'],
    ['horn', 'faction'],
    ['bell', 'faction'],
    ['ceremony', 'faction'],
    ['chime', 'system'],
  ];

  it.each(roleFixtures)('resolves a curated asset for role "%s"', (role, entityType) => {
    const asset = resolveCardSound(
      makeCard({ audioType: role, entityType, entityName: 'Nameless' }),
    );
    expect(asset).not.toBeNull();
    expect(asset?.role).toBe(role);
    expect(asset?.url).toMatch(/^https:\/\//);
  });
});

describe('resolveCardSound — semantic matching', () => {
  it('maps a large ancient lightning beast to beast.large.roar.lightning', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'creature',
        entityName: 'Ancient Lightning Beast',
        audioType: 'roar',
        sound: { size: 'giant', element: 'lightning', threatTier: 'calamity' },
      }),
    );
    expect(asset?.id).toBe('beast.large.roar.lightning');
  });

  it('maps a celestial sword to weapon.sword.unsheathe.celestial', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'artifact',
        entityName: 'Celestial Sword',
        audioType: 'unsheathe',
      }),
    );
    expect(asset?.id).toBe('weapon.sword.unsheathe.celestial');
  });

  it('maps a sealed relic to artifact.relic.awakening.sealed', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'artifact',
        entityName: 'Sealed Relic of the First Emperor',
        audioType: 'awakening',
        sound: { artifactCategory: 'relic' },
      }),
    );
    expect(asset?.id).toBe('artifact.relic.awakening.sealed');
  });

  it('maps a mountain sect to location.sect.mountain.signature', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'location',
        entityName: 'Azure Mountain Sect',
        audioType: 'signature',
      }),
    );
    expect(asset?.id).toBe('location.sect.mountain.signature');
  });

  it('serves faction cards from shared sect/temple entries too', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'faction',
        entityName: 'Mountain Sect of the Nine Peaks',
        audioType: 'signature',
      }),
    );
    expect(asset?.id).toBe('location.sect.mountain.signature');
  });

  it('expands descriptor synonyms (colossal/primordial/thunder) into catalog tags', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'creature',
        entityName: 'Colossal Primordial Thunder Serpent',
        audioType: 'roar',
      }),
    );
    expect(asset?.id).toBe('beast.large.roar.lightning');
  });

  it('falls back to the generic per-role asset when no semantics match', () => {
    const asset = resolveCardSound(
      makeCard({ entityType: 'creature', entityName: 'Nameless Thing', audioType: 'roar' }),
    );
    expect(asset?.id).toBe('beast.generic.roar');
  });

  it('honors an explicit curated assetId pin over semantic matching', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'creature',
        entityName: 'Celestial Sword', // misleading name; the pin must win
        audioType: 'roar',
        sound: { assetId: 'beast.wolf.howl.moon' },
      }),
    );
    expect(asset?.id).toBe('beast.wolf.howl.moon');
  });

  it('normalizes near-synonym audioType aliases onto catalog roles', () => {
    expect(resolveCardSoundRole('growl')).toBe('roar');
    expect(resolveCardSoundRole('ring')).toBe('metallic_ring');
    expect(resolveCardSoundRole('ambient')).toBe('ambience');
  });
});

describe('resolveCardSound — graceful failure', () => {
  it('returns null for tts_line cards without reporting them (quotes are TTS, not SFX)', () => {
    const listener = vi.fn();
    setUnresolvedCardSoundListener(listener);
    expect(resolveCardSound(makeCard({ audioType: 'tts_line' }))).toBeNull();
    expect(listener).not.toHaveBeenCalled();
  });

  it('returns null and reports an unknown role instead of guessing a replacement', () => {
    const listener = vi.fn();
    setUnresolvedCardSoundListener(listener);
    const card = makeCard({ audioType: 'sneeze' as WorldCardEvent['audioType'] });
    expect(resolveCardSound(card)).toBeNull();
    expect(listener).toHaveBeenCalledWith(card, 'unknown-role');
  });

  it('returns null and reports a role/entity combination with no curated entry', () => {
    const listener = vi.fn();
    setUnresolvedCardSoundListener(listener);
    const card = makeCard({ entityType: 'creature', audioType: 'bell' });
    expect(resolveCardSound(card)).toBeNull();
    expect(listener).toHaveBeenCalledWith(card, 'no-catalog-match');
  });
});
