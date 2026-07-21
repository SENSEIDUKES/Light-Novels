import { describe, expect, it } from 'vitest';
import sourceCatalog from './celestial_library_catalog_cleaned.json';
import {
  ATMOSPHERE_BED_CATALOG,
  ATMOSPHERE_CATEGORIES,
  atmosphereMetadataTags,
  buildAtmosphereBedCatalog,
  resolveAtmosphereBed,
  type CuratedAtmosphereBed,
} from './ambienceSoundCatalog';

const catalog: CuratedAtmosphereBed[] = [
  { id: 'wind.ridge', category: 'atmosphere', variation: 'wind', tags: ['mountain', 'ridge'], url: 'wind.mp3' },
  { id: 'crowd.market', category: 'atmosphere', variation: 'crowd', tags: ['market', 'chatter'], url: 'market.mp3' },
  { id: 'crowd.festival', category: 'atmosphere', variation: 'crowd', tags: ['festival', 'cheering'], url: 'festival.mp3' },
  { id: 'waves.harbor', category: 'atmosphere', variation: 'waves', tags: ['coast', 'harbor'], url: 'waves.mp3' },
  { id: 'rain.market', category: 'atmosphere', variation: 'rain', tags: ['rain', 'market'], url: 'rain.mp3' },
  { id: 'noise.foundry', category: 'atmosphere', variation: 'noise', tags: ['foundry', 'machinery'], url: 'noise.mp3' },
];

describe('ambience sound catalog', () => {
  it('keeps the six stable atmosphere categories without fixing their variations', () => {
    expect(ATMOSPHERE_CATEGORIES).toEqual(['wind', 'crowd', 'waves', 'rain', 'combat', 'noise']);
  });

  it('loads all 50 atmosphere tracks with exact DEFAULT paths and real catalog metadata', () => {
    const sourceAtmosphere = sourceCatalog.filter(
      (entry) => entry.metadata.main_category === 'atmosphere',
    );

    expect(sourceAtmosphere).toHaveLength(50);
    expect(ATMOSPHERE_BED_CATALOG).toHaveLength(50);
    expect(new Set(ATMOSPHERE_BED_CATALOG.map((asset) => asset.id)).size).toBe(50);
    for (const asset of ATMOSPHERE_BED_CATALOG) {
      const source = sourceAtmosphere.find((entry) => entry.file_path === asset.id);
      expect(source).toBeDefined();
      expect(asset.id).toMatch(/^DEFAULT\//);
      expect(asset.url).toBe(source?.public_url);
      expect(asset.url).toContain('/DEFAULT/');
      expect(asset.category).toBe(source?.metadata.main_category);
      expect(asset.variation).toBe(source?.metadata.broad_variation);
      expect(asset.tags).toEqual(source?.metadata.soft_tags);
    }
  });

  it('skips malformed catalog entries and safely normalizes valid metadata', () => {
    expect(buildAtmosphereBedCatalog([
      null,
      42,
      [],
      {},
      { file_path: 'missing-metadata.mp3', public_url: 'https://cdn.test/missing.mp3' },
      {
        file_path: 'DEFAULT/atmosphere/Rain/Test_Rain_1.mp3',
        public_url: 'https://cdn.test/DEFAULT/atmosphere/Rain/Test_Rain_1.mp3',
        metadata: {
          main_category: 'ATMOSPHERE',
          broad_variation: 'RAIN',
          soft_tags: ['STORM', null, 42],
        },
      },
    ])).toEqual([expect.objectContaining({
      id: 'DEFAULT/atmosphere/Rain/Test_Rain_1.mp3',
      category: 'atmosphere',
      variation: 'rain',
      tags: ['storm'],
      url: 'https://cdn.test/DEFAULT/atmosphere/Rain/Test_Rain_1.mp3',
    })]);
  });

  it('selects a curated variation from concrete scene metadata and its tags', () => {
    const bed = resolveAtmosphereBed(
      { sceneType: 'travel', environment: ['coast', 'harbor'] },
      { catalog },
    );
    expect(bed?.id).toBe('waves.harbor');
  });

  it('uses the explicit category to route while open-ended tags choose the variation', () => {
    const bed = resolveAtmosphereBed(
      {
        atmosphereCategory: 'crowd',
        environment: ['market', 'busy'],
        atmosphereTags: ['chatter', 'vendors'],
      },
      { catalog },
    );
    expect(bed?.id).toBe('crowd.market');
  });

  it('does not treat travel as rain', () => {
    expect(resolveAtmosphereBed({ sceneType: 'travel' }, { catalog })).toBeNull();
  });

  it('requires stronger evidence for a live scene switch', () => {
    expect(resolveAtmosphereBed({ environment: ['coast'] }, { catalog, minimumScore: 2 })).toBeNull();
    expect(resolveAtmosphereBed({ environment: ['coast', 'harbor'] }, { catalog, minimumScore: 2 })?.id)
      .toBe('waves.harbor');
  });

  it('does not guess between equally matched variations', () => {
    const ambiguousCatalog = [
      { id: 'rain.alley', category: 'atmosphere' as const, variation: 'rain' as const, tags: ['rain', 'alley'], url: 'alley.mp3' },
      { id: 'rain.roof', category: 'atmosphere' as const, variation: 'rain' as const, tags: ['rain', 'roof'], url: 'roof.mp3' },
    ];
    expect(resolveAtmosphereBed({ environment: ['rain'] }, { catalog: ambiguousCatalog })).toBeNull();
  });

  it('keeps metadata extraction literal rather than deriving a sound from intensity', () => {
    expect(atmosphereMetadataTags({
      atmosphereCategory: 'crowd',
      sceneType: 'travel',
      atmosphereTags: ['night-market'],
    })).toEqual(['crowd', 'travel', 'night', 'market']);
  });

  it('uses real soft tags to select a concrete production variation', () => {
    expect(resolveAtmosphereBed({
      atmosphereCategory: 'rain',
      environment: ['heavy', 'storm', 'thunder'],
    })?.id).toBe('DEFAULT/atmosphere/Rain/Heavy_Rainstorm_2.mp3');
  });
});
