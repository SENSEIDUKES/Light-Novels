export type ManifestationEntityType = 'character' | 'faction' | 'artifact' | 'location';

export type NarrativeWeight = 'central' | 'major' | 'supporting' | 'minor';

/**
 * Deliberately explicit editorial signals used to decide whether an entity
 * belongs in the visual Codex. This is authored by the metadata pass, never
 * inferred from a flashy name alone.
 */
export interface ManifestationImportance {
  narrativeWeight: NarrativeWeight;
  recurrence?: boolean;
  ownership?: boolean;
  plotRelevance?: boolean;
  namedStatus?: boolean;
  emotionalSignificance?: boolean;
  powerSignificance?: boolean;
  futureRelevance?: boolean;
}

type ManifestationCandidate = {
  imageUrl?: string;
  manifestationImportance?: ManifestationImportance;
};

const relevanceSignals = (importance: ManifestationImportance) => [
  importance.recurrence,
  importance.ownership,
  importance.plotRelevance,
  importance.emotionalSignificance,
  importance.powerSignificance,
  importance.futureRelevance,
].filter(Boolean).length;

/**
 * A named entity is not automatically visual material. It must have a major
 * narrative role plus two durable story signals, or be a supporting entity
 * with an unusually strong case for returning. Existing images always remain
 * visible so this policy never erases a previously manifested entry.
 */
export const isManifestationEligible = (
  entry: ManifestationCandidate | null | undefined,
  _type?: ManifestationEntityType,
): boolean => {
  if (!entry) return false;
  if (entry.imageUrl) return true;

  const importance = entry.manifestationImportance;
  if (!importance?.namedStatus || importance.narrativeWeight === 'minor') {
    return false;
  }

  const signals = relevanceSignals(importance);
  return (
    (importance.narrativeWeight === 'central' || importance.narrativeWeight === 'major')
      ? signals >= 2
      : importance.narrativeWeight === 'supporting' && signals >= 4
  );
};
