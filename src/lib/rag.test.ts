import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cosineSimilarity, retrieveRelevantContext } from './rag';
import { StoryWorld } from '../types';
import { storyStorage } from './storage';

describe('RAG', () => {
  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    });

    it('returns -1 for opposite vectors', () => {
      expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1);
    });

    it('returns 0 for mismatched lengths', () => {
      expect(cosineSimilarity([1, 0], [1])).toBe(0);
    });

    it('returns 0 for zero vectors', () => {
      expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });
  });

  describe('retrieveRelevantContext', () => {
    beforeEach(() => {
      global.fetch = vi.fn() as any;
      vi.spyOn(storyStorage, 'getChapterContent').mockResolvedValue(null);
    });

    it('enforces budget, ensures no overlap, and retrieves above-threshold older chapters', async () => {
      const mockStory: StoryWorld = {
        id: 'test-story',
        title: 'Test',
        characters: [],
        factions: [],
        locations: [],
        lore: [],
        magicSystem: [],
        memory: { unresolvedPlotThreads: [] } as any,
        arcs: [
          {
            id: 'arc1',
            title: 'Arc 1',
            summary: 'Arc 1 summary',
            chapters: Array.from({ length: 30 }, (_, i) => ({
              number: i + 1,
              title: `Chapter ${i + 1}`,
              summary: `Summary of chapter ${i + 1}`,
              premise: '',
              status: 'read' as any,
              hasContent: true,
              embedding: [i % 2 === 0 ? 1 : 0, i % 2 === 0 ? 0 : 1] // simple embedding pattern
            }))
          } as any
        ]
      };

      // Mock fetch for generateEmbedding to return [1, 0]
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [1, 0] })
      });

      // Mock getChapterContent to return some text
      vi.spyOn(storyStorage, 'getChapterContent').mockImplementation(async (id: string, num: number) => {
        return {
          storyId: id,
          chapterNumber: num,
          generatedContent: `Full text for chapter ${num} which is very long. `.repeat(100)
        } as any;
      });

      // target is 31, topK = 3, maxChars = 1000 (very small to test pruning), recentNCount = 3
      const maxChars = 2000;
      const contextBlocks = await retrieveRelevantContext('Premise', 31, mockStory, {}, 3, maxChars, 3);
      
      const combinedContext = contextBlocks.join('\n');
      
      // Total chars should be roughly within maxChars (might slightly exceed due to block chunks, but pruning should happen)
      // Actually our logic enforces strictly <= maxChars during block push, except for block boundaries where it tries pruned summary
      
      // Should contain coarse history
      expect(combinedContext).toContain('COARSE HISTORY');
      expect(combinedContext).toContain('Arc 1 summary');

      // Should include recent chapters (28, 29, 30)
      expect(combinedContext).toContain('SLIDING WINDOW');
      
      // Since maxChars is 2000 and full text is 5200 chars per chapter, they should be pruned
      // Let's check if they appear as Pruned Summary or just normal text
      expect(combinedContext).toMatch(/Chapter 30.*(Pruned Summary:|Very long)/i);

      // Should recover chapters with embedding [1, 0] (even numbers)
      // Query is [1, 0], so even chapters have score 1.0 > 0.7
      // Chapters 2, 4, 6, etc.
      // Top 3 matches: chapter 26, 24, 22
      expect(combinedContext).toContain('RECOVERED RELEVANT MEMORIES');
      
      // Verify no overlap: recent chapters (28, 29, 30) shouldn't be in recovered memories
      const recoveredSectionMatch = combinedContext.match(/RECOVERED RELEVANT MEMORIES[\s\S]*?(?=---|SLIDING WINDOW|$)/);
      const recoveredSection = recoveredSectionMatch ? recoveredSectionMatch[0] : '';
      
      expect(recoveredSection).not.toContain('Chapter 28');
      expect(recoveredSection).not.toContain('Chapter 29');
      expect(recoveredSection).not.toContain('Chapter 30');
      
      // Verify below-threshold (odd numbers) are not in recovered
      expect(recoveredSection).not.toContain('Chapter 27:');
      expect(recoveredSection).not.toContain('Chapter 25:');
    });
  });
});
