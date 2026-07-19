import {
  ChapterContract,
  ChapterHandoff,
  ContractReport,
  SceneFingerprint,
  StoryMemory,
} from '../../types';
import { resolveEntity } from '../../lib/entityResolver';

/**
 * Stage B deterministic validation (Context Engine 2.5). Runs AFTER metadata
 * extraction, BEFORE persistence. Pure string/set operations — no LLM calls.
 *
 * Prose is final at this point, so this stage never triggers repair. It
 * produces hard faults (which set the reader-facing continuity flag) only for
 * near-certain duplicates, and quiet warnings for everything else. Absent
 * inputs (no handoff, no contract, legacy chapters) validate as clean.
 */

export interface HandoffValidationInput {
  chapterNumber: number;
  /** This chapter's freshly extracted handoff. */
  handoff?: ChapterHandoff;
  /** The contract this chapter was generated against. */
  contract?: ChapterContract;
  contractReport?: ContractReport;
  /** memoryUpdates from the metadata extraction (raw LLM deltas). */
  memoryUpdates?: any;
  memory: StoryMemory;
  /** Fingerprints from all prior chapters. */
  priorFingerprints: SceneFingerprint[];
  /** Target chapter premise; rematch intent downgrades dupes to soft. */
  premise?: string;
}

export interface HandoffValidationResult {
  hardFaults: string[];
  warnings: string[];
}

const REMATCH_INTENT =
  /\b(rematch|again|once more|round two|second (duel|battle|round|clash)|return(s|ing)? to|revisit)\b/i;

const PARTICIPANT_JACCARD_THRESHOLD = 0.6;

const normalizeName = (name: string) => name.trim().toLowerCase();

const participantJaccard = (a: string[], b: string[]): number => {
  const setA = new Set(a.map(normalizeName));
  const setB = new Set(b.map(normalizeName));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const name of setA) {
    if (setB.has(name)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

type LocationMatch = 'strong' | 'weak' | 'none';

/**
 * Location rule: both known-and-equal or both unknown → strong; exactly one
 * unknown → weak (an unextracted location must not match ANY location, so a
 * weak match can only ever produce a soft warning); known-and-different → no
 * match at all — a rematch in a new place is a new scene.
 */
const matchLocations = (a?: string, b?: string): LocationMatch => {
  const locA = a?.trim().toLowerCase();
  const locB = b?.trim().toLowerCase();
  if (locA && locB) return locA === locB ? 'strong' : 'none';
  if (!locA && !locB) return 'strong';
  return 'weak';
};

const fingerprintLabel = (fp: SceneFingerprint) =>
  `${fp.actionType} — ${fp.participants.join(', ')}${fp.location ? ` at ${fp.location}` : ''} → ${fp.outcome}`;

const findDuplicateScenes = (
  input: HandoffValidationInput,
): { hardFaults: string[]; warnings: string[] } => {
  const hardFaults: string[] = [];
  const warnings: string[] = [];
  const newFingerprints = input.handoff?.fingerprints || [];
  if (newFingerprints.length === 0 || input.priorFingerprints.length === 0) {
    return { hardFaults, warnings };
  }

  const rematchIntended = REMATCH_INTENT.test(input.premise || '');

  for (const fresh of newFingerprints) {
    for (const prior of input.priorFingerprints) {
      if (prior.actionType !== fresh.actionType) continue;
      if (participantJaccard(prior.participants, fresh.participants)
        < PARTICIPANT_JACCARD_THRESHOLD) continue;
      const locationMatch = matchLocations(prior.location, fresh.location);
      if (locationMatch === 'none') continue;

      const message =
        `Duplicate scene: Chapter ${input.chapterNumber} scene `
        + `"${fingerprintLabel(fresh)}" matches completed Chapter ${prior.chapterNumber} scene `
        + `"${fingerprintLabel(prior)}".`;

      // Hard only for the near-certain case: strong location match against the
      // immediately previous chapter, with no rematch intent in the premise.
      const isHard = locationMatch === 'strong'
        && prior.chapterNumber === input.chapterNumber - 1
        && !rematchIntended;
      if (isHard) {
        hardFaults.push(message);
      } else {
        warnings.push(message);
      }
      break;
    }
  }

  return { hardFaults, warnings };
};

const validateArtifactUpdates = (input: HandoffValidationInput): string[] => {
  const warnings: string[] = [];
  const artifacts = input.memory.artifacts || [];
  const characters = input.memory.characters || [];
  const updates: any[] = input.memoryUpdates?.artifactUpdates || [];
  const newArtifacts: any[] = input.memoryUpdates?.newArtifacts || [];

  for (const update of updates) {
    if (!update?.name) continue;
    const resolved = resolveEntity(update.name, artifacts, 'handoffArtifactCheck');
    const artifact = artifacts.find(a => a.id === resolved.resolvedEntityId);
    if (!artifact) continue;

    if (
      (artifact.condition === 'destroyed' || artifact.condition === 'consumed')
      && update.newOwner
      && update.newCondition !== 'intact'
      && update.newCondition !== 'damaged'
    ) {
      warnings.push(
        `Artifact state: "${artifact.name}" is marked ${artifact.condition} in the Codex `
        + `but chapter ${input.chapterNumber} assigns it a new owner ("${update.newOwner}") `
        + `without restoring it.`,
      );
    }

    if (update.newOwner) {
      const owner = resolveEntity(update.newOwner, characters, 'handoffOwnerCheck');
      const ownerChar = characters.find(c => c.id === owner.resolvedEntityId);
      if (ownerChar?.status === 'deceased') {
        warnings.push(
          `Artifact state: "${artifact.name}" was given to "${ownerChar.name}", `
          + `who is marked deceased in the Codex.`,
        );
      }
    }
  }

  for (const fresh of newArtifacts) {
    if (!fresh?.name) continue;
    const resolved = resolveEntity(fresh.name, artifacts, 'handoffNewArtifactCheck');
    const existing = artifacts.find(a => a.id === resolved.resolvedEntityId);
    if (existing) {
      warnings.push(
        `Artifact state: chapter ${input.chapterNumber} introduces "${fresh.name}" as new, `
        + `but it already exists in the Codex`
        + `${existing.currentOwner ? ` (owner: ${existing.currentOwner})` : ''}.`,
      );
    }
  }

  return warnings;
};

const validateAbilityAcquisitions = (input: HandoffValidationInput): string[] => {
  const warnings: string[] = [];
  const abilities = input.memory.abilities || [];
  const freshAbilities: any[] = input.memoryUpdates?.newMCAbilities || [];
  if (freshAbilities.length === 0 || abilities.length === 0) return warnings;

  const abilityObjects = abilities.map(a =>
    typeof a === 'string'
      ? { id: a, name: a }
      : { id: a.id || a.name, name: a.name, aliases: a.aliases });

  for (const fresh of freshAbilities) {
    const name = typeof fresh === 'string' ? fresh : fresh?.name;
    if (!name) continue;
    const resolved = resolveEntity(name, abilityObjects, 'handoffAbilityCheck');
    if (resolved.resolvedEntityId !== null) {
      warnings.push(
        `Ability ledger: "${name}" was re-acquired in chapter ${input.chapterNumber} `
        + `but already exists in the ledger; it will be merged as a progression event, not duplicated.`,
      );
    }
  }

  return warnings;
};

const validateContractReport = (input: HandoffValidationInput): string[] => {
  const warnings: string[] = [];
  if (!input.contract || !input.contractReport) return warnings;

  if (input.contractReport.objectiveFulfilled === false) {
    warnings.push(
      `Chapter objective: chapter ${input.chapterNumber} did not visibly fulfill its `
      + `contract objective ("${input.contract.objective}").`,
    );
  }
  if (
    input.contractReport.openingMatched === false
    && (input.contract.startingState || input.contract.requiredOpening)
  ) {
    warnings.push(
      `Chapter opening: chapter ${input.chapterNumber} did not open consistent with the `
      + `previous chapter's canonical end state.`,
    );
  }

  return warnings;
};

export const validateChapterHandoff = (
  input: HandoffValidationInput,
): HandoffValidationResult => {
  const duplicates = findDuplicateScenes(input);
  return {
    hardFaults: duplicates.hardFaults,
    warnings: [
      ...duplicates.warnings,
      ...validateArtifactUpdates(input),
      ...validateAbilityAcquisitions(input),
      ...validateContractReport(input),
    ],
  };
};
