import { describe, expect, it } from 'vitest';
import {
  createStorySeedCollectionExport,
  createStorySeedExport,
  parseStorySeedJson,
} from './storySeedFormat';
import type { StorySeedPayload } from '../types';

const payload: StorySeedPayload = {
  intake: {
    novelTitle: 'The Jade Gate',
    mcName: 'Lin',
    genrePath: 'Xianxia',
    corePremise: 'A sealed gate awakens.',
    customCharacters: [{ id: 'character-internal-id', name: 'Lin', aliases: ['Gate Bearer'] }],
    customFactions: [{ id: 'faction-internal-id', name: 'Cloud Sect' }],
  },
  blueprint: {
    title: 'The Jade Gate',
    logline: 'A sealed gate awakens.',
    worldOverview: 'A mountain cultivation realm.',
    startingLocation: 'Cloud Sect',
    societyStructure: 'Sects and clans',
    powerSystemOutline: 'Nine cultivation realms',
    mcProfile: 'A patient outer disciple',
    majorFactions: ['Cloud Sect'],
    initialCharacters: ['Lin'],
    majorMysteries: ['Who sealed the gate?'],
    firstArcPromise: 'Open the first seal',
    tropeRules: 'Earn every breakthrough',
    styleBible: 'Close third person',
    destinedEnding: 'Ascension',
    estimatedArcs: 5,
    unresolvedPlotThreads: ['The missing elder'],
  },
};

describe('story seed JSON format', () => {
  it('exports only portable seed inputs without account, story, or nested internal IDs', () => {
    const exported = createStorySeedExport({
      ...payload,
      id: 'firebase-seed-id',
      userId: 'account-id',
      chapters: [{ generatedContent: 'prose' }],
      images: ['cover.png'],
      codex: { characters: [] },
    } as StorySeedPayload);
    const serialized = JSON.stringify(exported);

    expect(exported).toMatchObject({
      format: 'seihouse-story-seed',
      version: 1,
      seed: {
        intake: { novelTitle: 'The Jade Gate' },
        blueprint: { title: 'The Jade Gate' },
      },
    });
    expect(serialized).not.toContain('firebase-seed-id');
    expect(serialized).not.toContain('account-id');
    expect(serialized).not.toContain('character-internal-id');
    expect(serialized).not.toContain('faction-internal-id');
    expect(serialized).not.toContain('generatedContent');
    expect(serialized).not.toContain('cover.png');
    expect(serialized).not.toContain('codex');
  });

  it('round-trips a single seed and assigns fresh form-local nested IDs', () => {
    const parsed = parseStorySeedJson(JSON.stringify(createStorySeedExport(payload)));

    expect(parsed).toHaveLength(1);
    expect(parsed[0].blueprint).toEqual(payload.blueprint);
    expect(parsed[0].intake.customCharacters?.[0]).toMatchObject({
      name: 'Lin',
      aliases: ['Gate Bearer'],
      id: expect.stringMatching(/^seed-character-/),
    });
    expect(parsed[0].intake.customFactions?.[0]).toMatchObject({
      name: 'Cloud Sect',
      id: expect.stringMatching(/^seed-faction-/),
    });
  });

  it('round-trips an export-all package', () => {
    const parsed = parseStorySeedJson(JSON.stringify(
      createStorySeedCollectionExport([payload, {
        ...payload,
        blueprint: { ...payload.blueprint, title: 'Second Seed' },
      }]),
    ));

    expect(parsed.map(seed => seed.blueprint.title)).toEqual(['The Jade Gate', 'Second Seed']);
  });

  it('keeps compatibility with the previous raw intake JSON import', () => {
    const [parsed] = parseStorySeedJson(JSON.stringify({
      novelTitle: 'Legacy Intake',
      corePremise: 'A previous raw seed config.',
      startingPowerConcept: 'Runic cultivation',
    }));

    expect(parsed.intake).toMatchObject({
      novelTitle: 'Legacy Intake',
      corePremise: 'A previous raw seed config.',
    });
    expect(parsed.blueprint).toMatchObject({
      title: 'Legacy Intake',
      logline: 'A previous raw seed config.',
      powerSystemOutline: 'Runic cultivation',
    });
  });

  it('rejects generated story packages instead of silently importing generated content', () => {
    expect(() => parseStorySeedJson(JSON.stringify({
      id: 'story-1',
      title: 'Generated Story',
      memory: { characters: [] },
      arcs: [{ chapters: [] }],
    }))).toThrow('generated story package');
  });
});
