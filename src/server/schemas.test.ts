import { describe, it, expect, vi } from 'vitest';
import { validateBody, embedSchema, storyMemorySchema } from './schemas';
import { z } from 'zod';

describe('schemas validation middleware', () => {
  it('accepts the approved Codex context fields and nested user pin', () => {
    const parsed = storyMemorySchema.parse({
      powerSystem: '',
      currentPowerStage: '',
      worldRules: [],
      unresolvedPlotThreads: [],
      resolvedPlotThreads: [],
      characters: [{
        id: 'char-1',
        name: 'Mei Lian',
        role: 'Mentor',
        description: '',
        relationshipToMC: 'Ally',
        status: 'alive',
        aliases: ['Sister Mei'],
        contextPriority: 8,
        authorContextNote: 'Never betrays the protagonist.',
        provenance: { lastMentionedChapter: 4, isUserPinned: true },
      }],
    });

    expect(parsed.characters[0]).toMatchObject({
      aliases: ['Sister Mei'],
      contextPriority: 8,
      authorContextNote: 'Never betrays the protagonist.',
      provenance: { lastMentionedChapter: 4, isUserPinned: true },
    });
    expect(parsed.characters[0]).not.toHaveProperty('pinned');
  });

  it('rejects invalid approved Codex context field types', () => {
    expect(() => storyMemorySchema.parse({
      powerSystem: '',
      currentPowerStage: '',
      worldRules: [],
      unresolvedPlotThreads: [],
      resolvedPlotThreads: [],
      characters: [{
        id: 'char-1',
        name: 'Mei Lian',
        role: 'Mentor',
        description: '',
        relationshipToMC: 'Ally',
        status: 'alive',
        aliases: 'Sister Mei',
      }],
    })).toThrow();
  });

  it('calls next() if validation passes', () => {
    const middleware = validateBody(embedSchema);
    const req = { body: { text: 'hello' } } as any;
    const res = {} as any;
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 400 with error details if validation fails', () => {
    const middleware = validateBody(embedSchema);
    const req = { body: { text: 123 } } as any; // Invalid type
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Invalid request payload')
      })
    );
  });
});
