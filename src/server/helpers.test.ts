import { describe, it, expect } from 'vitest';
import { rankRelevantEntities, filterRelevantEntities, formatAbilityLedgerForPrompt, isValidOllamaHost, truncateContextIfNeeded } from './helpers';

describe('Server Helpers', () => {
  describe('rankRelevantEntities', () => {
    it('ranks entities correctly based on context', () => {
      const entities = [
        { name: 'John', description: 'A hero' },
        { name: 'Alice', description: 'A villain' }
      ];
      
      const ranked = rankRelevantEntities(entities, 'John', 'Alice attacked', 'A hero named John fought', []);
      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].name).toBe('John'); // John is MC
    });
    
    it('returns empty array when entities is undefined', () => {
      expect(rankRelevantEntities(undefined, 'John', '', '', [])).toEqual([]);
    });

    it('matches aliases in prose and forces aliases mentioned in the last summary', () => {
      const entity = {
        name: 'Mei Lian',
        aliases: ['Sister Mei', 'the Pavilion Mistress'],
        description: 'Keeper of the eastern pavilion'
      };

      expect(rankRelevantEntities([entity], '', '', 'Sister Mei closed the gates.', [])).toEqual([entity]);
      expect(rankRelevantEntities([entity], '', 'The Pavilion Mistress vanished.', '', [], 0)).toEqual([entity]);
    });

    it('matches aliases only as exact boundary-aware surface forms', () => {
      const entity = { name: 'Mei Lian', aliases: ['Master'], description: 'A teacher' };

      expect(rankRelevantEntities([entity], '', '', 'The Master entered.', [])).toHaveLength(1);
      expect(rankRelevantEntities([entity], '', '', 'The Grandmaster entered.', [])).toEqual([]);
      expect(rankRelevantEntities([entity], '', '', 'Mastre entered.', [])).toEqual([]);
    });

    it('does not use a colliding alias to select either entity', () => {
      const entities = [
        { name: 'Mei Lian', aliases: ['Master'] },
        { name: 'Lan Wei', aliases: ['Master'] },
      ];

      expect(rankRelevantEntities(entities, '', '', 'Master entered.', [])).toEqual([]);
    });

    it('filters colliding aliases and legacy context from nested character abilities', () => {
      const [character] = rankRelevantEntities([{
        name: 'Mei Lian',
        abilities: [
          'Moon Dance',
          {
            name: 'Moon Step',
            description: 'A movement art',
            aliases: ['Moon Dance'],
            pinned: true,
            priority: 99,
            contextNote: 'Legacy note',
          },
        ],
      }], '', '', 'Mei Lian entered.', []);

      expect(character.abilities).toEqual([
        'Moon Dance',
        { name: 'Moon Step', description: 'A movement art' },
      ]);
    });

    it('always includes provenance-pinned entities even when they exceed the normal budget', () => {
      const pinned = Array.from({ length: 3 }, (_, index) => ({
        name: `Pinned ${index}`,
        provenance: { isUserPinned: true },
      }));

      expect(rankRelevantEntities(pinned, '', '', '', [], 1)).toHaveLength(3);
    });

    it('uses contextPriority to break equal relevance scores', () => {
      const ranked = rankRelevantEntities([
        { name: 'Azure Hall', contextPriority: 1 },
        { name: 'Crimson Hall', contextPriority: 10 }
      ], '', '', 'Azure Hall and Crimson Hall prepare for war.', [], 1);

      expect(ranked.map(entity => entity.name)).toEqual(['Crimson Hall']);
    });

    it('preserves an explicit authoritative authorContextNote in prompt context', () => {
      const entity = {
        name: 'Mei Lian',
        description: 'Generated public description',
        authorContextNote: 'Never uses contractions; secretly hates the MC.'
      };

      const [rendered] = rankRelevantEntities([entity], '', '', 'Mei Lian arrives.', []);

      expect(rendered.description).toBe(entity.description);
      expect(rendered.authorContextNote).toBe(entity.authorContextNote);
      expect(rendered).not.toHaveProperty('contextNote');
      expect(rendered).not.toHaveProperty('pinned');
      expect(entity.description).toBe('Generated public description');
    });

    it('forces an entity mentioned only by alias in the continuation anchor', () => {
      const entity = {
        name: 'Mei Lian',
        aliases: ['Sister Mei'],
        description: 'Keeper of the eastern pavilion',
      };

      expect(rankRelevantEntities(
        [entity],
        '',
        '',
        '',
        [],
        0,
        'Sister Mei barred the door behind the protagonist.',
      )).toEqual([entity]);
    });

    it('does not let anchor-forced entities displace the MC or pinned entities', () => {
      const entities = [
        { name: 'Lan Wei', role: 'Protagonist' },
        {
          name: 'Old Master Ren',
          provenance: { isUserPinned: true },
        },
        {
          name: 'Mei Lian',
          aliases: ['Sister Mei'],
        },
      ];

      const ranked = rankRelevantEntities(
        entities,
        'Lan Wei',
        '',
        '',
        [],
        1,
        'Sister Mei waits beside the gate.',
      );

      expect(ranked.map(entity => entity.name)).toEqual([
        'Lan Wei',
        'Old Master Ren',
        'Mei Lian',
      ]);
    });

    it('weights anchor token overlap at twice the premise-token weight', () => {
      const ranked = rankRelevantEntities([
        { name: 'Azure Keeper', description: 'Guards the moonlit threshold' },
        { name: 'Crimson Keeper', description: 'Guards the ember threshold' },
      ], '', '', 'ember', [], 1, 'moonlit');

      expect(ranked.map(entity => entity.name)).toEqual(['Azure Keeper']);
    });

    it('keeps omitted-anchor calls identical to an explicit undefined anchor', () => {
      const entities = [
        { name: 'Azure Hall', description: 'A mountain sect' },
        { name: 'Crimson Hall', description: 'A river sect' },
      ];

      expect(rankRelevantEntities(
        entities,
        '',
        '',
        'Azure Hall gathers',
        [],
        1,
      )).toEqual(rankRelevantEntities(
        entities,
        '',
        '',
        'Azure Hall gathers',
        [],
        1,
        undefined,
      ));
    });
  });

  describe('filterRelevantEntities', () => {
    it('filters entities based on contexts', () => {
      const entities = [
        { name: 'John', description: 'A hero' },
        { name: 'Alice', description: 'A villain' },
        { name: 'Bob', evolutionReady: true }
      ];
      const filtered = filterRelevantEntities(entities, 'John did something');
      expect(filtered.length).toBe(2); // John and Bob (evolutionReady)
      expect(filtered.map(e => e.name)).toContain('John');
      expect(filtered.map(e => e.name)).toContain('Bob');
    });

    it('returns empty array when entities is undefined', () => {
      expect(filterRelevantEntities(undefined, 'test')).toEqual([]);
    });
  });

  describe('ensureString', () => {
    it('returns string representation', async () => {
      const { ensureString } = await import('./helpers');
      expect(ensureString('test')).toBe('test');
      expect(ensureString(123)).toBe('123');
      expect(ensureString(null)).toBe('');
      expect(ensureString(undefined)).toBe('');
      expect(ensureString({})).toBe('');
      expect(ensureString({ a: 1 })).toBe('A: 1');
    });
  });

  describe('cleanBlueprint', () => {
    it('cleans blueprint properly', async () => {
      const { cleanBlueprint } = await import('./helpers');
      const mockBp = { title: 'Test', logline: 'Test Logline', majorMysteries: null };
      const cleaned = cleanBlueprint(mockBp);
      expect(cleaned.title).toBe('Test');
      expect(cleaned.logline).toBe('Test Logline');
      expect(Array.isArray(cleaned.majorMysteries)).toBe(true);
    });
  });

  describe('cleanInitialArc', () => {
    it('cleans initial arc', async () => {
      const { cleanInitialArc } = await import('./helpers');
      const mockArc = { title: 'Arc 1', characters: [], worldRules: [] };
      const cleaned = cleanInitialArc(mockArc);
      expect(cleaned.title).toBe('Arc 1');
      expect(Array.isArray(cleaned.characters)).toBe(true);
      expect(Array.isArray(cleaned.worldRules)).toBe(true);
    });

    it('removes model-created aliases and author context metadata', async () => {
      const { cleanInitialArc } = await import('./helpers');
      const cleaned = cleanInitialArc({
        characters: [{
          name: 'Mei Lian',
          role: 'Mentor',
          aliases: ['Sister Mei'],
          authorContextNote: 'Invented note',
          provenance: { isUserPinned: true },
        }],
      });

      expect(cleaned.characters[0]).toEqual({ name: 'Mei Lian', role: 'Mentor' });
    });
  });

  describe('cleanSteerArc', () => {
    it('cleans steer arc', async () => {
      const { cleanSteerArc } = await import('./helpers');
      const mockSteer = { title: 'Steer 1', newCharacters: [] };
      const cleaned = cleanSteerArc(mockSteer);
      expect(cleaned.title).toBe('Steer 1');
      expect(Array.isArray(cleaned.newCharacters)).toBe(true);
    });

    it('removes model-created aliases from steered characters', async () => {
      const { cleanSteerArc } = await import('./helpers');
      const cleaned = cleanSteerArc({
        newCharacters: [{ name: 'Lan Wei', aliases: ['Little Lan'], contextPriority: 10 }],
      });

      expect(cleaned.newCharacters[0]).toEqual({ name: 'Lan Wei' });
    });
  });

  describe('cleanChapterResponse', () => {
    it('cleans chapter response', async () => {
      const { cleanChapterResponse } = await import('./helpers');
      const mockChap = { title: 'Chap 1', body: 'Body text', newCharacters: [], loreAdditions: [] };
      const cleaned = cleanChapterResponse(mockChap);
      expect(cleaned.title).toBe('Chap 1');
      expect(cleaned.body).toBe('Body text');
      expect(Array.isArray(cleaned.newCharacters)).toBe(true);
      expect(Array.isArray(cleaned.loreAdditions)).toBe(true);
    });
  });

  describe('cleanChapterResponse with abilities', () => {
    it('cleans memory updates with abilities', async () => {
      const { cleanChapterResponse } = await import('./helpers');
      const mockMeta = { 
        summary: 'Test', 
        memoryUpdates: {
          newMCAbilities: [{ name: 'Fireball', masteryLevel: 'Novice' }],
          mcAbilityUpdates: [{ name: 'Fireball', newMasteryLevel: 'Adept' }]
        }
      };
      const cleaned = cleanChapterResponse(mockMeta);
      expect(cleaned.summary).toBe('Test');
      expect(Array.isArray(cleaned.memoryUpdates.newMCAbilities)).toBe(true);
      expect(cleaned.memoryUpdates.newMCAbilities[0].name).toBe('Fireball');
      expect(Array.isArray(cleaned.memoryUpdates.mcAbilityUpdates)).toBe(true);
      expect(cleaned.memoryUpdates.mcAbilityUpdates[0].name).toBe('Fireball');
    });
  });

  describe('truncateContextIfNeeded', () => {
    it('preserves the MC ability ledger in serialized story memory', () => {
      const abilities = [
        'Nine Star Fist',
        {
          id: 'ability-2',
          name: 'Void Step',
          description: 'Crosses a short distance through folded space.',
          masteryLevel: 'Novice',
          limits: 'Once per encounter'
        }
      ];

      const { memoryJsonStr } = truncateContextIfNeeded({ abilities }, [], 80000);

      expect(JSON.parse(memoryJsonStr).abilities).toEqual(abilities);
    });

    it('strips model-proposed aliases and other author-controlled context fields', async () => {
      const { cleanChapterResponse } = await import('./helpers');
      const cleaned = cleanChapterResponse({
        memoryUpdates: {
          newCharacters: [{
            name: 'Mei Lian',
            aliases: ['Sister Mei'],
            contextPriority: 10,
            authorContextNote: 'Trust the model',
            provenance: { isUserPinned: true },
          }],
          characterStatusUpdates: [{
            name: 'Mei Lian',
            aliases: ['the Pavilion Mistress']
          }]
        }
      });

      expect(cleaned.memoryUpdates.newCharacters[0]).toEqual({ name: 'Mei Lian' });
      expect(cleaned.memoryUpdates.characterStatusUpdates[0]).toEqual({ name: 'Mei Lian' });
    });
  });

  describe('formatAbilityLedgerForPrompt', () => {
    it('bounds and sanitizes the ability ledger for chapter prompts', () => {
      const abilities = Array.from({ length: 31 }, (_, index) => ({
        id: `ability-${index}`,
        name: `Ability ${index}`,
        description: 'd'.repeat(1100),
        limits: 'l'.repeat(600),
        masteryLevel: 'm'.repeat(300),
        provenance: { source: 'chapter-analysis', evidence: 'unused prompt metadata' }
      }));

      const formatted = formatAbilityLedgerForPrompt([
        null,
        ...abilities,
        's'.repeat(1100)
      ]) as Array<string | Record<string, unknown>>;

      expect(formatted).toHaveLength(30);
      expect((formatted[0] as Record<string, unknown>).name).toBe('Ability 2');
      expect((formatted[0] as Record<string, unknown>).description).toHaveLength(1003);
      expect((formatted[0] as Record<string, unknown>).limits).toHaveLength(503);
      expect((formatted[0] as Record<string, unknown>).masteryLevel).toHaveLength(203);
      expect(formatted[0]).not.toHaveProperty('id');
      expect(formatted[0]).not.toHaveProperty('provenance');
      expect(formatted.at(-1)).toHaveLength(1003);
    });

    it('returns an empty ledger for missing or malformed abilities', () => {
      expect(formatAbilityLedgerForPrompt(undefined)).toEqual([]);
      expect(formatAbilityLedgerForPrompt({ name: 'Not an array' })).toEqual([]);
    });

    it('retains provenance-pinned abilities and applies approved context metadata', () => {
      const abilities = [
        {
          id: 'old-pinned',
          name: 'Heaven Step',
          aliases: ['Sky Walk'],
          provenance: { isUserPinned: true, lastMentionedChapter: 2, createdBy: 'user' },
          contextPriority: 9,
          description: 'Generated description',
          authorContextNote: 'Cannot be used underground.'
        },
        ...Array.from({ length: 30 }, (_, index) => ({
          id: `new-${index}`,
          name: `New Ability ${index}`,
          description: 'Recent technique'
        }))
      ];

      const formatted = formatAbilityLedgerForPrompt(abilities) as Array<Record<string, unknown>>;
      const pinned = formatted.find(ability => ability.name === 'Heaven Step');

      expect(formatted).toHaveLength(30);
      expect(pinned).toMatchObject({
        aliases: ['Sky Walk'],
        provenance: { isUserPinned: true, lastMentionedChapter: 2 },
        contextPriority: 9,
        authorContextNote: 'Cannot be used underground.',
        description: 'Generated description'
      });
      expect(pinned).not.toHaveProperty('pinned');
      expect(pinned).not.toHaveProperty('priority');
      expect((pinned?.provenance as Record<string, unknown>)).not.toHaveProperty('createdBy');
      expect(formatted.some(ability => ability.name === 'New Ability 0')).toBe(false);
    });

    it('checks alias collisions against abilities omitted by the prompt cap', () => {
      const abilities = [
        'Moon Dance',
        ...Array.from({ length: 29 }, (_, index) => ({ name: `Filler ${index}` })),
        { name: 'Moon Step', aliases: ['Moon Dance'], description: 'A movement art' },
      ];

      const formatted = formatAbilityLedgerForPrompt(abilities) as Array<string | Record<string, unknown>>;
      const moonStep = formatted.find(ability => (
        typeof ability === 'object' && ability.name === 'Moon Step'
      ));

      expect(formatted).toHaveLength(30);
      expect(formatted).not.toContain('Moon Dance');
      expect(moonStep).toEqual({ name: 'Moon Step', description: 'A movement art' });
    });
  });

  describe('isValidOllamaHost', () => {
    it('allows localhost', () => {
      expect(isValidOllamaHost('http://localhost:11434')).toBe(true);
      expect(isValidOllamaHost('http://127.0.0.1:11434')).toBe(true);
      expect(isValidOllamaHost('http://[::1]:11434')).toBe(true);
    });

    it('blocks malicious hosts and port bypasses', () => {
      expect(isValidOllamaHost('http://malicious.com')).toBe(false);
      expect(isValidOllamaHost('http://169.254.169.254/metadata')).toBe(false);
      expect(isValidOllamaHost('http://localhost:6379')).toBe(false); // Block Redis/other ports
    });

    it('allows OLLAMA_HOST from env and blocks bypasses', () => {
      process.env.OLLAMA_HOST = 'http://my-ollama:11434';
      expect(isValidOllamaHost('http://my-ollama:11434')).toBe(true);
      expect(isValidOllamaHost('http://my-ollama:22')).toBe(false); // Block port bypass
      expect(isValidOllamaHost('http://localhost:11434')).toBe(false); // Block localhost bypass when remote is set
      delete process.env.OLLAMA_HOST;
    });
  });
});
