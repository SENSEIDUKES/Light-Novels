import { normalizeCodexAliases, normalizeCodexSurface } from './codexContext';

export interface ResolutionResult {
  rawName: string;
  resolvedEntityId: string | null;
  confidence: number;
  updateType: string;
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function resolveEntity(rawName: string, entities: { id: string, name?: string, aliases?: string[] }[], updateType: string): ResolutionResult {
  const normalizedRawName = normalizeCodexSurface(rawName);
  if (!normalizedRawName) {
    return { rawName, resolvedEntityId: null, confidence: 0, updateType };
  }

  const namedEntities = entities.filter((entity): entity is { id: string; name: string; aliases?: string[] } =>
    entity && typeof entity.name === 'string' && normalizeCodexSurface(entity.name).length > 0
  );

  const exactCanonicalMatches = namedEntities.filter(entity =>
    normalizeCodexSurface(entity.name) === normalizedRawName
  );
  if (exactCanonicalMatches.length > 0) {
    return {
      rawName,
      resolvedEntityId: exactCanonicalMatches[0].id,
      confidence: 1,
      updateType,
    };
  }
  // Aliases are explicit identity keys. They resolve only on an exact normalized
  // match, and a collision is deliberately unresolved rather than array-order wins.
  const exactAliasMatches = namedEntities.filter(entity =>
    normalizeCodexAliases(entity.aliases, entity.name)
      .some(alias => normalizeCodexSurface(alias) === normalizedRawName)
  );
  if (exactAliasMatches.length === 1) {
    return {
      rawName,
      resolvedEntityId: exactAliasMatches[0].id,
      confidence: 1,
      updateType,
    };
  }
  if (exactAliasMatches.length > 1) {
    return { rawName, resolvedEntityId: null, confidence: 1, updateType };
  }

  // Preserve legacy partial/fuzzy resolution for canonical names only. Never
  // fuzzy-match an alias: a typo or descriptive phrase must not become identity.
  let bestMatchId: string | null = null;
  let bestConfidence = 0;

  for (const entity of namedEntities) {
    const entityName = normalizeCodexSurface(entity.name);
    let confidence: number;
    if (entityName.includes(normalizedRawName) || normalizedRawName.includes(entityName)) {
      confidence = 0.8;
    } else {
      const distance = levenshteinDistance(normalizedRawName, entityName);
      const maxLength = Math.max(normalizedRawName.length, entityName.length);
      confidence = maxLength > 0 ? 1 - (distance / maxLength) : 0;
    }

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatchId = entity.id;
    }
  }

  if (bestConfidence < 0.6) {
    bestMatchId = null;
  }

  return {
    rawName,
    resolvedEntityId: bestMatchId,
    confidence: bestConfidence,
    updateType
  };
}
