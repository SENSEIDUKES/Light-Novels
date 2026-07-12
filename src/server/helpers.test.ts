import { describe, it, expect } from 'vitest';
import { rankRelevantEntities, filterRelevantEntities, isValidOllamaHost, truncateContextIfNeeded } from './helpers';

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
  });

  describe('cleanSteerArc', () => {
    it('cleans steer arc', async () => {
      const { cleanSteerArc } = await import('./helpers');
      const mockSteer = { title: 'Steer 1', newCharacters: [] };
      const cleaned = cleanSteerArc(mockSteer);
      expect(cleaned.title).toBe('Steer 1');
      expect(Array.isArray(cleaned.newCharacters)).toBe(true);
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
