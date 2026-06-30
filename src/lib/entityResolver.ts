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

export function resolveEntity(rawName: string, entities: { id: string, name?: string }[], updateType: string): ResolutionResult {
  let bestMatchId: string | null = null;
  let bestConfidence = 0;

  const lowerRawName = rawName.toLowerCase();

  for (const entity of entities) {
    if (!entity.name) continue;
    const entityNameLower = entity.name.toLowerCase();
    
    let confidence = 0;
    if (entityNameLower === lowerRawName) {
      confidence = 1.0;
    } else if (entityNameLower.includes(lowerRawName) || lowerRawName.includes(entityNameLower)) {
      confidence = 0.8;
    } else {
      const distance = levenshteinDistance(lowerRawName, entityNameLower);
      const maxLength = Math.max(lowerRawName.length, entityNameLower.length);
      confidence = 1 - (distance / maxLength);
    }

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatchId = entity.id;
    }
  }

  if (bestConfidence < 0.6) {
    bestMatchId = null; // Confidence too low
  }

  return {
    rawName,
    resolvedEntityId: bestMatchId,
    confidence: bestConfidence,
    updateType
  };
}
