import { describe, it, expect, vi } from 'vitest';
import { generateUUID, generateId } from './id';

describe('id utility', () => {
  describe('generateUUID', () => {
    it('generates a valid looking UUID', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('generates unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('generateId', () => {
    it('generates an ID of specified length', () => {
      expect(generateId(5).length).toBe(5);
      expect(generateId(15).length).toBe(15);
    });

    it('generates unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId(10));
      }
      expect(ids.size).toBe(100);
    });

    it('uses only allowed characters', () => {
      const id = generateId(100);
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });
});
