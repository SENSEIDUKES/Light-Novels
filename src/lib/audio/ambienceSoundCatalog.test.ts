import { describe, expect, it } from 'vitest';
import sourceCatalog from './celestial_library_catalog_cleaned.json';
import {
  ATMOSPHERE_BED_CATALOG,
  ATMOSPHERE_CATEGORIES,
  resolveAtmosphereBed,
} from './ambienceSoundCatalog';

describe('ATMOSPHERE_BED_CATALOG', () => {
  it('loads all 50 atmosphere tracks and only atmosphere tracks', () => {
    const sourceAtmosphere = sourceCatalog.filter(
      (entry) => entry.metadata.main_category === 'atmosphere',
    );

    expect(sourceAtmosphere).toHaveLength(50);
    expect(ATMOSPHERE_BED_CATALOG).toHaveLength(sourceAtmosphere.length);
    expect(new Set(ATMOSPHERE_BED_CATALOG.map((asset) => asset.id)).size).toBe(50);
    expect(new Set(ATMOSPHERE_BED_CATALOG.map((asset) => asset.variation))).toEqual(
      new Set(ATMOSPHERE_CATEGORIES),
    );
  });

  it('preserves each entry’s real category, variation, tags, and public_url', () => {
    for (const asset of ATMOSPHERE_BED_CATALOG) {
      const source = sourceCatalog.find((entry) => entry.file_path === asset.id);
      expect(source).toBeDefined();
      expect(asset.category).toBe(source?.metadata.main_category);
      expect(asset.variation).toBe(source?.metadata.broad_variation);
      expect(asset.tags).toEqual(source?.metadata.soft_tags);
      expect(asset.url).toBe(source?.public_url);
    }
  });
});

describe('resolveAtmosphereBed', () => {
  it('matches rain tracks using their real soft tags', () => {
    expect(resolveAtmosphereBed('rain', ['heavy', 'storm', 'thunder'])?.id).toBe(
      'DEFAULT/atmosphere/Rain/Heavy_Rainstorm_2.mp3',
    );
  });

  it('matches noise tracks using their real soft tags', () => {
    expect(resolveAtmosphereBed('noise', ['dripping', 'echoing', 'cavernous'])?.id).toBe(
      'DEFAULT/atmosphere/Noise/Cave_1.mp3',
    );
  });

  it('keeps the legacy ocean input as an alias for the real waves variation', () => {
    const asset = resolveAtmosphereBed('ocean', ['crashing', 'powerful', 'roaring']);
    expect(asset?.variation).toBe('waves');
    expect(asset?.id).toBe('DEFAULT/atmosphere/Waves/Strong_Waves_1.mp3');
  });

  it('returns null for a category outside the scene atmosphere catalog', () => {
    expect(resolveAtmosphereBed('signature')).toBeNull();
  });
});
