/**
 * Crash-recovery snapshot for a single-chapter generation run.
 *
 * A browser reload cannot keep a model request alive, so a run that was in
 * flight when the tab died leaves exactly one frozen record behind. The record
 * is written once, when the run starts, and is owned by that run's id: only the
 * run that wrote it may remove it, so a stale continuation can never discard a
 * newer run's offer.
 *
 * Five-chapter batches deliberately write nothing here — their persisted
 * `chapterGenerationBatch` checkpoint is authoritative for resuming.
 */
export const ACTIVE_GENERATION_STORAGE_KEY = 'seihouse_active_generation';

export interface GenerationRecoverySnapshot {
  runId: string;
  userId: string | null;
  storyId: string;
  chapterNumber: number;
  timestamp: number;
}

const isSnapshot = (value: unknown): value is GenerationRecoverySnapshot => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.runId === 'string'
    && candidate.runId.length > 0
    && (typeof candidate.userId === 'string' || candidate.userId === null)
    && typeof candidate.storyId === 'string'
    && candidate.storyId.length > 0
    && typeof candidate.chapterNumber === 'number'
    && Number.isFinite(candidate.chapterNumber)
    && typeof candidate.timestamp === 'number'
    && Number.isFinite(candidate.timestamp)
  );
};

/** Read the stored snapshot, ignoring anything that is not a complete record. */
export const readGenerationRecoverySnapshot = (): GenerationRecoverySnapshot | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_GENERATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** Freeze the snapshot for a starting run. Storage failures are never fatal. */
export const writeGenerationRecoverySnapshot = (snapshot: GenerationRecoverySnapshot): void => {
  try {
    localStorage.setItem(ACTIVE_GENERATION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Recovery is a convenience; a full quota must never break generation.
  }
};

export const clearGenerationRecoverySnapshot = (): void => {
  try {
    localStorage.removeItem(ACTIVE_GENERATION_STORAGE_KEY);
  } catch {
    // Nothing to do — the offer simply survives until it ages out.
  }
};

/**
 * Whether a resolved Firebase authentication state may keep an existing
 * recovery snapshot.
 *
 * A normal browser reload and a real account transition both arrive as an
 * `onAuthStateChanged` callback, and only the first resolution of a page
 * session can be the reload: the reader who wrote the draft is the reader
 * signing in. Every later resolution is a transition, and no account may
 * inherit another session's draft — including a sign-out, which resolves to no
 * user at all.
 */
export const shouldPreserveRecoverySnapshotOnAuthResolution = ({
  snapshot,
  isFirstAuthResolution,
  resolvedUserId,
}: {
  snapshot: GenerationRecoverySnapshot | null;
  isFirstAuthResolution: boolean;
  resolvedUserId: string | null;
}): boolean => {
  if (!snapshot) return false;
  if (!isFirstAuthResolution) return false;
  if (!resolvedUserId) return false;
  return snapshot.userId === resolvedUserId;
};

/**
 * Remove the snapshot only when it still belongs to `runId`.
 *
 * A run that lost ownership (account transition, superseded run) may settle
 * long after a newer run wrote its own snapshot; that late cleanup must leave
 * the newer record alone.
 */
export const clearGenerationRecoverySnapshotForRun = (runId: string): void => {
  const stored = readGenerationRecoverySnapshot();
  if (!stored || stored.runId !== runId) return;
  clearGenerationRecoverySnapshot();
};
