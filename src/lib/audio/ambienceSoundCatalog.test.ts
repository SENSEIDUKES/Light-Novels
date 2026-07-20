import { describe, expect, it } from 'vitest';
import {
  ATMOSPHERE_CATEGORIES,
  atmosphereMetadataTags,
  resolveAtmosphereBed,
  type CuratedAtmosphereBed,
} from './ambienceSoundCatalog';

const catalog: CuratedAtmosphereBed[] = [
  { id: 'wind.ridge', category: 'wind', tags: ['mountain', 'ridge'], url: 'wind.mp3' },
  { id: 'crowd.market', category: 'crowd', tags: ['market', 'chatter'], url: 'market.mp3' },
  { id: 'crowd.festival', category: 'crowd', tags: ['festival', 'cheering'], url: 'festival.mp3' },
  { id: 'waves.harbor', category: 'waves', tags: ['coast', 'harbor'], url: 'waves.mp3' },
  { id: 'rain.market', category: 'rain', tags: ['rain', 'market'], url: 'rain.mp3' },
  { id: 'noise.foundry', category: 'noise', tags: ['foundry', 'machinery'], url: 'noise.mp3' },
];

describe('ambience sound catalog', () => {
  it('keeps the six stable atmosphere categories without fixing their variations', () => {
    expect(ATMOSPHERE_CATEGORIES).toEqual(['wind', 'crowd', 'waves', 'rain', 'combat', 'noise']);
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
      { id: 'rain.alley', category: 'rain' as const, tags: ['rain', 'alley'], url: 'alley.mp3' },
      { id: 'rain.roof', category: 'rain' as const, tags: ['rain', 'roof'], url: 'roof.mp3' },
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
});
