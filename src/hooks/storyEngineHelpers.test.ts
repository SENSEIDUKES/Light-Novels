import { describe, it, expect, vi } from 'vitest';
import { extractJsonBlocks, extractJsonMeta, runMemoryLinter } from './storyEngineHelpers';
import { secureStorage } from '../lib/encryption';

describe('storyEngineHelpers', () => {
  describe('extractJsonBlocks', () => {
    it('extracts JSON array from text', () => {
      const raw = `Some text before
[
  { "text": "block 1" },
  { "text": "block 2" }
]
Some text after`;
      const result = extractJsonBlocks(raw);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('block 1');
      expect(result[1].text).toBe('block 2');
    });

    it('extracts individual JSON objects from lines', () => {
      const raw = `
{ "text": "block 1" }
some random text
{ "content": "block 2" }
`;
      const result = extractJsonBlocks(raw);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('block 1');
      expect(result[1].text).toBe('block 2');
    });

    it('extracts nested JSON objects safely', () => {
      const raw = `Here is some content: {"text": "hello { world }", "type": "paragraph"}`;
      const result = extractJsonBlocks(raw);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('hello { world }');
    });

    it('returns empty array if no valid JSON found', () => {
      const result = extractJsonBlocks("Just some random text without JSON");
      expect(result).toHaveLength(0);
    });

    it('keeps standalone system blocks that carry no prose text', () => {
      const raw = `
{ "id": "c1-p1", "type": "paragraph", "text": "He bowed to the elder." }
{ "id": "c1-p2", "type": "paragraph", "system": { "kind": "skill_acquired", "promptType": "progression", "title": "Technique Learned", "rows": [{ "label": "Technique", "value": "Azure Sky Sword Art" }] } }
`;
      const result = extractJsonBlocks(raw);
      expect(result).toHaveLength(2);
      expect(result[1].system.title).toBe('Technique Learned');
      expect(result[1].text).toBe('');
    });

    it('keeps standalone worldCard blocks that carry no prose text', () => {
      const raw = `{ "id": "c1-p3", "worldCard": { "entityType": "artifact", "entityName": "Moon Cauldron" } }`;
      const result = extractJsonBlocks(raw);
      expect(result).toHaveLength(1);
      expect(result[0].worldCard.entityName).toBe('Moon Cauldron');
      expect(result[0].text).toBe('');
    });

    it('keeps generated World Card sound hints but strips catalog identities and URLs', () => {
      const raw = JSON.stringify({
        id: 'c1-p5',
        worldCard: {
          entityType: 'artifact',
          entityName: 'Stormblade',
          sound: {
            assetFamily: 'weapon',
            weaponType: 'sword',
            element: 'lightning',
            tags: ['storm', 'https://example.test/asset.mp3', 'DEFAULT/Weapons/Reload/Tech_Reload_1.mp3'],
            assetId: 'DEFAULT/Weapons/Magic/Wind_Magic_1.mp3',
            url: 'https://example.test/asset.mp3',
            file_path: 'DEFAULT/Weapons/Magic/Wind_Magic_1.mp3',
          },
        },
      });

      const [block] = extractJsonBlocks(raw);
      expect(block.worldCard.sound).toEqual({
        assetFamily: 'weapon',
        weaponType: 'sword',
        element: 'lightning',
        tags: ['storm'],
      });
      expect(block.worldCard.sound).not.toHaveProperty('assetId');
      expect(block.worldCard.sound).not.toHaveProperty('url');
      expect(block.worldCard.sound).not.toHaveProperty('file_path');
    });

    it('preserves system metadata fields through parsing without dropping them', () => {
      const raw = `{ "id": "c1-p4", "type": "paragraph", "text": "A chime rang out.", "system": { "kind": "level_up", "promptType": "breakthrough", "title": "Breakthrough Achieved", "rarity": "Mythic", "rows": [{ "label": "Realm", "value": "Core Formation" }] } }`;
      const result = extractJsonBlocks(raw);
      expect(result).toHaveLength(1);
      expect(result[0].system.promptType).toBe('breakthrough');
      expect(result[0].system.kind).toBe('level_up');
      expect(result[0].system.rows).toHaveLength(1);
      expect(result[0].system.rarity).toBe('Mythic');
    });
  });

  describe('extractJsonMeta', () => {
    it('extracts clean JSON from markdown', () => {
      const raw = `
\`\`\`json
{ "title": "New Chapter", "status": "draft" }
\`\`\`
`;
      const result = extractJsonMeta(raw);
      expect(result).toEqual({ title: "New Chapter", status: "draft" });
    });

    it('removes <think> tags before parsing', () => {
      const raw = `
<think>Thinking process</think>
{ "title": "Clean Title" }
`;
      const result = extractJsonMeta(raw);
      expect(result.title).toBe("Clean Title");
    });

    it('finds the longest object if multiple exist or messy formatting', () => {
      const raw = `
Here is something: {"small": 1}
And the main meta: {"title": "Main Title", "summary": "Big summary of the chapter that makes it longer"}
`;
      const result = extractJsonMeta(raw);
      expect(result.title).toBe("Main Title");
    });

    it('returns empty object if no JSON found', () => {
      const result = extractJsonMeta("No JSON here");
      expect(result).toEqual({});
    });
  });

  describe('runMemoryLinter', () => {
    it('warns if a deceased character actively acts in the present', () => {
      const prevMemory = {
        characters: [{ name: 'Bob', status: 'deceased' }]
      } as any;
      const warnings = runMemoryLinter(prevMemory, {} as any, 'Bob walked into the room.');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Deceased character "Bob" appears to speak or act');
    });

    it('does NOT warn when a deceased character is merely mentioned (natural world-building)', () => {
      const prevMemory = {
        characters: [{ name: 'Bob', status: 'deceased' }]
      } as any;
      // Mourning / discussing / a technique named after them must not be flagged.
      const warnings = runMemoryLinter(prevMemory, {} as any, 'They lit incense for Bob and spoke of how much they missed him.');
      expect(warnings).toHaveLength(0);
    });

    it('does NOT warn when a deceased character acts within a flashback/vision', () => {
      const prevMemory = {
        characters: [{ name: 'Bob', status: 'deceased' }]
      } as any;
      const warnings = runMemoryLinter(prevMemory, {} as any, 'In a sudden memory, Bob walked into the room and smiled at her.');
      expect(warnings).toHaveLength(0);
    });

    it('warns about similar character names', () => {
      const nextMemory = {
        characters: [{ name: 'Alexander' }, { name: 'Alexandur' }]
      } as any;
      const warnings = runMemoryLinter({} as any, nextMemory, '');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Potential duplicate character names');
    });

    it('ignores same family names for similarity warning', () => {
      const nextMemory = {
        characters: [{ name: 'Smith John' }, { name: 'Smith Jane' }]
      } as any;
      const warnings = runMemoryLinter({} as any, nextMemory, '');
      expect(warnings).toHaveLength(0);
    });

    it('warns if plot thread is marked unresolved after being resolved', () => {
      const prevMemory = {
        resolvedPlotThreads: ['Find the sword']
      } as any;
      const nextMemory = {
        unresolvedPlotThreads: ['Find the sword']
      } as any;
      const warnings = runMemoryLinter(prevMemory, nextMemory, '');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('previously resolved but is now marked unresolved');
    });
  });
});
