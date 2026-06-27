import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runMemoryLinter, orchestrateChapterGeneration } from './orchestration';
import * as aiRouter from '../aiRouter';

vi.mock('../aiRouter', () => ({
  routeTextGenerationStream: vi.fn(),
  routeTextGeneration: vi.fn(),
  cleanAndParseJSON: vi.fn(),
}));

describe('Server Orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runMemoryLinter', () => {
    it('returns empty warnings when no power stage change', () => {
      const oldMemory = { currentPowerStage: 'Stage 1' };
      const newMemory = { currentPowerStage: 'Stage 1' };
      const warnings = runMemoryLinter(oldMemory, newMemory, 'Just a regular chapter text');
      expect(warnings).toHaveLength(0);
    });

    it('returns empty warnings when power stage changes and text contains breakthrough', () => {
      const oldMemory = { currentPowerStage: 'Stage 1' };
      const newMemory = { currentPowerStage: 'Stage 2' };
      const warnings = runMemoryLinter(oldMemory, newMemory, 'He had a massive breakthrough in his power!');
      expect(warnings).toHaveLength(0);
    });

    it('returns warning when power stage changes but no explicit text found', () => {
      const oldMemory = { currentPowerStage: 'Stage 1' };
      const newMemory = { currentPowerStage: 'Stage 2' };
      const warnings = runMemoryLinter(oldMemory, newMemory, 'He ate a sandwich.');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Warning: Power stage changed');
    });
  });

  describe('orchestrateChapterGeneration', () => {
    it('is exported as a function', () => {
      expect(typeof orchestrateChapterGeneration).toBe('function');
    });
    
    it('writes to response stream correctly', async () => {
      // Mock stream implementation
      const mockStream = (async function* () {
        yield '{"blocks":[{"text": "chapter body"}]}';
      })();
      
      vi.mocked(aiRouter.routeTextGenerationStream).mockResolvedValue(mockStream as any);
      vi.mocked(aiRouter.routeTextGeneration).mockResolvedValue('{}');
      
      const reqBody = {
        activeStory: {
          id: 'test',
          mcName: 'MC',
          memory: {},
          arcs: [
            {
              chapters: [
                { number: 1, hasContent: false, premise: 'start' }
              ]
            }
          ]
        },
        chapterNumber: 1,
        apiHeaders: {},
        routingConfig: {},
        pastSummaries: []
      };
      
      let writtenData = '';
      const req = {};
      const res = {
        setHeader: vi.fn(),
        write: vi.fn((data) => { writtenData += data; }),
        end: vi.fn()
      };
      const getCustomKeys = vi.fn();
      
      await orchestrateChapterGeneration(reqBody, getCustomKeys, req, res);
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.write).toHaveBeenCalled();
      expect(res.end).toHaveBeenCalled();
      expect(writtenData).toContain('type":"complete"');
      expect(writtenData).toContain('story');
    });
  });
});

