import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACTIVE_GENERATION_STORAGE_KEY,
  clearGenerationRecoverySnapshot,
  clearGenerationRecoverySnapshotForRun,
  readGenerationRecoverySnapshot,
  shouldPreserveRecoverySnapshotOnAuthResolution,
  writeGenerationRecoverySnapshot,
  type GenerationRecoverySnapshot,
} from './generationRecovery';

const snapshot = (overrides: Partial<GenerationRecoverySnapshot> = {}): GenerationRecoverySnapshot => ({
  runId: 'run-1',
  userId: 'reader-a',
  storyId: 'story-a',
  chapterNumber: 12,
  timestamp: 1_770_000_000_000,
  ...overrides,
});

describe('generationRecovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('the frozen snapshot', () => {
    it('round-trips exactly what the run wrote', () => {
      writeGenerationRecoverySnapshot(snapshot());

      expect(readGenerationRecoverySnapshot()).toEqual(snapshot());
    });

    it('ignores a record that is not a complete snapshot', () => {
      localStorage.setItem(
        ACTIVE_GENERATION_STORAGE_KEY,
        // The shape the removed live-rewriting subscription used to persist.
        JSON.stringify({ isGenerating: true, activeStoryId: 'story-a', timestamp: Date.now() }),
      );

      expect(readGenerationRecoverySnapshot()).toBeNull();
    });

    it('ignores unparseable storage without throwing', () => {
      localStorage.setItem(ACTIVE_GENERATION_STORAGE_KEY, '{not json');

      expect(readGenerationRecoverySnapshot()).toBeNull();
    });

    it('keeps a signed-out run\'s null owner', () => {
      writeGenerationRecoverySnapshot(snapshot({ userId: null }));

      expect(readGenerationRecoverySnapshot()?.userId).toBeNull();
    });
  });

  describe('run-owned removal', () => {
    it('removes the snapshot for the run that wrote it', () => {
      writeGenerationRecoverySnapshot(snapshot({ runId: 'run-1' }));

      clearGenerationRecoverySnapshotForRun('run-1');

      expect(readGenerationRecoverySnapshot()).toBeNull();
    });

    it('leaves a newer run\'s snapshot alone', () => {
      writeGenerationRecoverySnapshot(snapshot({ runId: 'run-2', chapterNumber: 20 }));

      clearGenerationRecoverySnapshotForRun('run-1');

      expect(readGenerationRecoverySnapshot()).toMatchObject({ runId: 'run-2', chapterNumber: 20 });
    });

    it('clears unconditionally when the reader discards the offer', () => {
      writeGenerationRecoverySnapshot(snapshot());

      clearGenerationRecoverySnapshot();

      expect(localStorage.getItem(ACTIVE_GENERATION_STORAGE_KEY)).toBeNull();
    });
  });

  describe('initial authentication versus a real account transition', () => {
    it('preserves the snapshot when the first resolved user wrote it', () => {
      expect(shouldPreserveRecoverySnapshotOnAuthResolution({
        snapshot: snapshot({ userId: 'reader-a' }),
        isFirstAuthResolution: true,
        resolvedUserId: 'reader-a',
      })).toBe(true);
    });

    it('deletes the snapshot when the first resolved user is a different account', () => {
      expect(shouldPreserveRecoverySnapshotOnAuthResolution({
        snapshot: snapshot({ userId: 'reader-a' }),
        isFirstAuthResolution: true,
        resolvedUserId: 'reader-b',
      })).toBe(false);
    });

    it('deletes the snapshot when the first resolution is signed out', () => {
      expect(shouldPreserveRecoverySnapshotOnAuthResolution({
        snapshot: snapshot({ userId: 'reader-a' }),
        isFirstAuthResolution: true,
        resolvedUserId: null,
      })).toBe(false);
      // ...including a snapshot that was itself written while signed out: a
      // signed-out session has no account to prove ownership with.
      expect(shouldPreserveRecoverySnapshotOnAuthResolution({
        snapshot: snapshot({ userId: null }),
        isFirstAuthResolution: true,
        resolvedUserId: null,
      })).toBe(false);
    });

    it('deletes the snapshot on every later resolution, even for the same account', () => {
      expect(shouldPreserveRecoverySnapshotOnAuthResolution({
        snapshot: snapshot({ userId: 'reader-a' }),
        isFirstAuthResolution: false,
        resolvedUserId: 'reader-a',
      })).toBe(false);
    });

    it('has nothing to preserve when no snapshot exists', () => {
      expect(shouldPreserveRecoverySnapshotOnAuthResolution({
        snapshot: null,
        isFirstAuthResolution: true,
        resolvedUserId: 'reader-a',
      })).toBe(false);
    });
  });
});
