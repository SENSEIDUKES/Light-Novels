import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cosineSimilarity, generateEmbedding, retrieveRelevantContext } from './rag';
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
      expect(cosineSimilarity([1, 1], [0, 0])).toBe(0);
    });

    it('returns 0 for empty arrays', () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('returns 1 for single element identical vectors', () => {
      expect(cosineSimilarity([5], [5])).toBe(1);
    });

    it('returns 1 for same direction different magnitudes', () => {
      expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
    });

    it('returns correct similarity for arbitrary vectors', () => {
      expect(cosineSimilarity([1, 2], [2, 1])).toBeCloseTo(0.8);
    });
  });

  describe('generateEmbedding', () => {
    beforeEach(() => {
      global.fetch = vi.fn() as any;
    });

    it('returns embedding on success', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: mockEmbedding })
      });

      const result = await generateEmbedding('test text');
      expect(result).toEqual(mockEmbedding);
      expect(global.fetch).toHaveBeenCalledWith('/api/embed', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'test text' })
      }));
    });

    it('returns null when response is not ok', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false
      });

      const result = await generateEmbedding('test text');
      expect(result).toBeNull();
    });

    it('returns null and logs error on fetch failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await generateEmbedding('test text');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to generate embedding', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('retrieveRelevantContext', () => {
    beforeEach(() => {
      global.fetch = vi.fn() as any;
      vi.spyOn(storyStorage, 'getChapterContent').mockResolvedValue(null);
    });

    const createMockStory = (arcs: any[]): StoryWorld => ({
      id: 'test-story',
      title: 'Test',
      genre: 'test',
      mcName: 'test',
      customPremise: 'test',
      createdAt: '',
      updatedAt: '',
      currentChapterNumber: 1,
      memory: { unresolvedPlotThreads: [] } as any,
      arcs: arcs
    });

    it('enforces budget, ensures no overlap, and retrieves above-threshold older chapters', async () => {
      const mockStory = createMockStory([
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
            embedding: [i % 2 === 0 ? 1 : 0, i % 2 === 0 ? 0 : 1]
          }))
        } as any
      ]);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [1, 0] })
      });

      vi.spyOn(storyStorage, 'getChapterContent').mockImplementation(async (id: string, num: number) => {
        return {
          storyId: id,
          chapterNumber: num,
          generatedContent: `Full text for chapter ${num} which is very long. `.repeat(100)
        } as any;
      });

      const maxChars = 2000;
      const contextBlocks = await retrieveRelevantContext('Premise', 31, mockStory, {}, 3, maxChars, 3);
      const combinedContext = contextBlocks.join('\n');
      expect(combinedContext).toContain('COARSE HISTORY');
      expect(combinedContext).toContain('Arc 1 summary');
      expect(combinedContext).toContain('SLIDING WINDOW');
      expect(combinedContext).toMatch(/Chapter 30.*(Pruned Summary:|Very long)/i);
      expect(combinedContext).toContain('RECOVERED RELEVANT MEMORIES');
    });

    it('handles different content types and budget edge cases', async () => {
      const mockStory = createMockStory([
        {
          id: 'arc1',
          title: 'Arc 1',
          summary: 'Arc 1 summary',
          episodicSummaries: ['Episodic summary 1', 'Episodic summary 2'],
          chapters: [
            { number: 1, summary: 'Summary 1', hasContent: true, embedding: [1, 0] },
            { number: 2, summary: 'Summary 2', hasContent: true, embedding: [0, 1] },
            { number: 3, summary: 'Summary 3', hasContent: true, embedding: [1, 0] }
          ]
        } as any
      ]);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [1, 0] })
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(storyStorage, 'getChapterContent').mockImplementation(async (id: string, num: number) => {
        if (num === 3) return { archivedBlocks: [{ text: 'Archived block' }] } as any;
        if (num === 2) throw new Error('Load error');
        return null;
      });

      const contextBlocks = await retrieveRelevantContext('Premise', 4, mockStory, {}, 3, 10000, 2);
      const combined = contextBlocks.join('\n');

      expect(combined).toContain('Archived block');
      expect(combined).toContain('Summary 2');
      expect(combined).toContain('Summary 1');
      expect(combined).toContain('RECOVERED RELEVANT MEMORIES');
      expect(combined).toContain('Episodic Log: Episodic summary 1 | Episodic summary 2');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('clears recovered blocks if only header fits', async () => {
      const mockStory = createMockStory([
        {
          id: 'arc1',
          title: 'Arc 1',
          chapters: [
            { number: 1, summary: 'Summary 1', hasContent: false, embedding: [1, 0] },
            { number: 2, summary: 'Summary 2', hasContent: false, embedding: [0, 1] }
          ]
        } as any
      ]);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [1, 0] })
      });

      const maxChars = 99;
      const contextBlocks = await retrieveRelevantContext('Premise', 3, mockStory, {}, 3, maxChars, 1);
      const combined = contextBlocks.join('\n');
      expect(combined).not.toContain('RECOVERED RELEVANT MEMORIES');
      expect(combined).toContain('Summary 2');
    });

    it('handles episodic summary in chapter content', async () => {
      const mockStory = createMockStory([
        {
          id: 'arc1',
          title: 'Arc 1',
          chapters: [
            { number: 1, summary: 'Summary 1', hasContent: true, embedding: [0, 1] }
          ]
        } as any
      ]);

      vi.spyOn(storyStorage, 'getChapterContent').mockResolvedValue({
        episodicSummary: 'Detailed episodic summary'
      } as any);

      const contextBlocks = await retrieveRelevantContext('Premise', 2, mockStory, {}, 3, 10000, 1);
      const combined = contextBlocks.join('\n');
      expect(combined).toContain('Detailed episodic summary');
    });

    it('prunes recent chapters when they do not fit in full', async () => {
      const mockStory = createMockStory([
        {
          id: 'arc1',
          title: 'Arc 1',
          chapters: [
            { number: 1, summary: 'Short summary', hasContent: true }
          ]
        } as any
      ]);

      vi.spyOn(storyStorage, 'getChapterContent').mockResolvedValue({
        generatedContent: 'Very long content that will definitely exceed the small character budget set in this test.'
      } as any);

      const maxChars = 100;
      const contextBlocks = await retrieveRelevantContext('Premise', 2, mockStory, {}, 3, maxChars, 1);
      const combined = contextBlocks.join('\n');
      expect(combined).toContain('Pruned Summary: Short summary');
      expect(combined).not.toContain('Very long content');
    });

    it('handles generatedContent and missing initial summary', async () => {
      const mockStory = createMockStory([
        {
          id: 'arc1',
          title: 'Arc 1',
          chapters: [{ number: 1, summary: '', hasContent: true }]
        } as any,
        {
          id: 'arc2',
          title: 'Arc 2',
          chapters: [{ number: 10, summary: 'Future', hasContent: false }]
        } as any
      ]);

      vi.spyOn(storyStorage, 'getChapterContent').mockResolvedValue({
        summary: 'Recovered Summary',
        generatedContent: 'Newly generated content'
      } as any);

      const contextBlocks = await retrieveRelevantContext('Premise', 5, mockStory, {}, 3, 10000, 1);
      const combined = contextBlocks.join('\n');

      expect(combined).toContain('Newly generated content');
      expect(combined).toContain('Chapter 1:');
      expect(combined).not.toContain('arc2');
    });
  });
});
