import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  CARD_SOUND_LIBRARY,
  resolveCardSound,
  resolveCardSoundRole,
  setUnresolvedCardSoundListener,
} from './cardSoundCatalog';
import sourceCatalog from './celestial_library_catalog_cleaned.json';
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
  it('loads every non-atmosphere asset from the source catalog exactly once', () => {
    const sourceWorldCardAssets = sourceCatalog.filter(
      (entry) => entry.metadata.main_category !== 'atmosphere',
    );
    const ids = CARD_SOUND_LIBRARY.map((a) => a.id);

    expect(CARD_SOUND_LIBRARY).toHaveLength(sourceWorldCardAssets.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses the source public_url, category, variation, and tags', () => {
    for (const asset of CARD_SOUND_LIBRARY) {
      const source = sourceCatalog.find((entry) => entry.file_path === asset.id);
      expect(source).toBeDefined();
      expect(asset.url).toBe(source?.public_url);
      expect(asset.category).toBe(source?.metadata.main_category.toLowerCase());
      expect(asset.variation).toBe(source?.metadata.broad_variation.toLowerCase());
      expect(asset.tags).toEqual(source?.metadata.soft_tags.map((tag) => tag.toLowerCase()));
      expect(() => new URL(asset.url)).not.toThrow();
      expect(asset.url).toMatch(/^https:\/\//);
      expect(asset.url).toMatch(/\.(mp3|wav|ogg)$/);
      expect(asset.url).not.toContain('/AUDIO/SFX/');
    }
  });
});

describe('resolveCardSound — role coverage', () => {
  // Every role represented by the real catalog resolves for its entity type.
  const roleFixtures: Array<[WorldCardSoundRole, WorldCardEvent['entityType']]> = [
    ['roar', 'creature'],
    ['call', 'creature'],
    ['hiss', 'creature'],
    ['howl', 'creature'],
    ['screech', 'creature'],
    ['wingbeat', 'creature'],
    ['unsheathe', 'artifact'],
    ['metallic_ring', 'artifact'],
    ['activation_hum', 'artifact'],
    ['resonance', 'artifact'],
    ['awakening', 'artifact'],
    ['pulse', 'artifact'],
    ['magical_activation', 'artifact'],
    ['signature', 'location'],
    ['chant', 'faction'],
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
  it('matches a ferocious large monster against the catalog soft tags', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'creature',
        entityName: 'Ferocious Large Monster',
        audioType: 'roar',
      }),
    );
    expect(asset?.id).toBe('DEFAULT/Beasts/Roar/Giant_Beast_Roar_2.mp3');
  });

  it('matches a sword using the catalog weapon category, variation, and tags', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'artifact',
        entityName: 'Celestial Sword',
        audioType: 'unsheathe',
      }),
    );
    expect(asset?.id).toBe('DEFAULT/Weapons/Unsheathe/Epic_Sword_Unsheathe_1.mp3');
  });

  it('maps awakening to the real artifact upgrade variation', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'artifact',
        entityName: 'Sealed Relic of the First Emperor',
        audioType: 'awakening',
        sound: { artifactCategory: 'relic' },
      }),
    );
    expect(asset?.id).toBe('DEFAULT/Artifacts/Upgrade/Upgrade_1.mp3');
  });

  it('matches a sect location using the catalog gong tags', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'location',
        entityName: 'Azure Mountain Sect',
        audioType: 'signature',
        sound: { tags: ['gong', 'deep', 'single-hit'] },
      }),
    );
    expect(asset?.id).toBe('DEFAULT/Locations/Signatures/Sect_Gong_2.mp3');
  });

  it('keeps location and faction World Card roles exclusive', () => {
    const locationRoles = CARD_SOUND_LIBRARY
      .filter((asset) => asset.entityTypes.includes('location'))
      .map((asset) => asset.role);
    const factionRoles = CARD_SOUND_LIBRARY
      .filter((asset) => asset.entityTypes.includes('faction'))
      .map((asset) => asset.role);

    expect(new Set(locationRoles)).toEqual(new Set(['signature']));
    expect(new Set(factionRoles)).toEqual(new Set(['chant']));
  });

  it('does not resolve removed location or faction roles, including through a pin', () => {
    const listener = vi.fn();
    setUnresolvedCardSoundListener(listener);
    const legacyLocation = makeCard({
      entityType: 'location',
      audioType: 'ambience' as WorldCardEvent['audioType'],
      sound: { assetId: 'DEFAULT/Locations/Signatures/Sect_Gong_1.mp3' },
    });
    const legacyFaction = makeCard({
      entityType: 'faction',
      audioType: 'horn' as WorldCardEvent['audioType'],
      sound: { assetId: 'DEFAULT/Factions/Tribal_Chant_1.mp3' },
    });

    expect(resolveCardSound(legacyLocation)).toBeNull();
    expect(resolveCardSound(legacyFaction)).toBeNull();
    expect(listener).toHaveBeenCalledWith(legacyLocation, 'unknown-role');
    expect(listener).toHaveBeenCalledWith(legacyFaction, 'unknown-role');
  });

  it('expands descriptor synonyms into the catalog tag vocabulary', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'creature',
        entityName: 'Colossal Sky Beast',
        audioType: 'wingbeat',
      }),
    );
    expect(asset?.id).toBe('DEFAULT/Beasts/WingBeat/Large_Wings_2.mp3');
  });

  it('falls back deterministically to the first source entry when no semantics match', () => {
    const asset = resolveCardSound(
      makeCard({ entityType: 'creature', entityName: 'Nameless Thing', audioType: 'roar' }),
    );
    expect(asset?.id).toBe('DEFAULT/Beasts/Growl/Medium_Growl_1.mp3');
  });

  it('honors an explicit curated assetId pin over semantic matching', () => {
    const asset = resolveCardSound(
      makeCard({
        entityType: 'creature',
        entityName: 'Celestial Sword', // misleading name; the pin must win
        audioType: 'roar',
        sound: { assetId: 'DEFAULT/Beasts/Howl/Medium_Beast_Howl_3.wav' },
      }),
    );
    expect(asset?.id).toBe('DEFAULT/Beasts/Howl/Medium_Beast_Howl_3.wav');
    expect(asset?.url).toBe(
      'https://celestialaudio.seihouse.org/DEFAULT/Beasts/Howl/Medium_Beast_Howl_3.wav',
    );
  });

  it('normalizes near-synonym audioType aliases onto catalog roles', () => {
    expect(resolveCardSoundRole('growl')).toBe('roar');
    expect(resolveCardSoundRole('ring')).toBe('metallic_ring');
    expect(resolveCardSoundRole('ambient')).toBeNull();
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
    const card = makeCard({ entityType: 'creature', audioType: 'bell' as WorldCardEvent['audioType'] });
    expect(resolveCardSound(card)).toBeNull();
    expect(listener).toHaveBeenCalledWith(card, 'unknown-role');
  });

  it('keeps supported roles unavailable when the real catalog has no matching asset', () => {
    const listener = vi.fn();
    setUnresolvedCardSoundListener(listener);
    const card = makeCard({ entityType: 'artifact', audioType: 'swing' });
    expect(resolveCardSound(card)).toBeNull();
    expect(listener).toHaveBeenCalledWith(card, 'no-catalog-match');
  });
});
