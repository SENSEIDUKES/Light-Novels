import { CosmicArtifact } from '../types';

export interface CultivatorPortraitRequest {
  image?: string;
  description?: string;
  daoRank?: string;
  daoXp?: number;
  powerStage?: string;
  equippedArtifact?: Pick<CosmicArtifact, 'id' | 'name' | 'description' | 'rarity'> | null;
  routingConfig?: unknown;
}

interface CultivatorPortraitResponse {
  imageUrl?: unknown;
  error?: string;
}

/** Calls the portrait pipeline and verifies that the UI received a renderable image. */
export async function generateCultivatorPortrait(
  request: CultivatorPortraitRequest,
  apiHeaders: Record<string, string>
): Promise<string> {
  const response = await fetch('/api/generate-cultivator-portrait', {
    method: 'POST',
    headers: { ...apiHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  let data: CultivatorPortraitResponse = {};
  try {
    data = await response.json();
  } catch {
    // Use the HTTP status below if an upstream proxy returns a non-JSON response.
  }

  if (!response.ok) {
    throw new Error(data.error || `Celestial mapping failed (${response.status})`);
  }
  if (typeof data.imageUrl !== 'string' || !data.imageUrl.trim()) {
    throw new Error('No image URL returned from celestial plane.');
  }
  return data.imageUrl;
}
