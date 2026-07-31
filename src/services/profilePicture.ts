import { CosmicArtifact } from '../types';

export interface ProfilePictureRequest {
  image?: string;
  description?: string;
  daoRank?: string;
  daoXp?: number;
  powerStage?: string;
  equippedArtifact?: Pick<CosmicArtifact, 'id' | 'name' | 'description' | 'rarity'>;
  routingConfig?: unknown;
}

interface ProfilePictureResponse {
  imageUrl?: unknown;
  promptUsed?: unknown;
  error?: string;
}

export interface GeneratedProfilePicture {
  imageUrl: string;
  promptUsed: string;
}

/** Calls the portrait pipeline and verifies that the UI received a renderable image. */
export async function generateProfilePicture(
  request: ProfilePictureRequest,
  apiHeaders: Record<string, string>
): Promise<GeneratedProfilePicture> {
  const response = await fetch('/api/generate-cultivator-portrait', {
    method: 'POST',
    headers: { ...apiHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  let data: ProfilePictureResponse = {};
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
  return {
    imageUrl: data.imageUrl,
    promptUsed: typeof data.promptUsed === 'string' ? data.promptUsed : '',
  };
}
