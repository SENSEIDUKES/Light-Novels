import { describe, it, expect, vi } from 'vitest';
import { validateBody, embedSchema } from './schemas';
import { z } from 'zod';

describe('schemas validation middleware', () => {
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
