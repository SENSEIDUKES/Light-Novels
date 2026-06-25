import { IntakeData, WorldBlueprint, StoryMemory } from '../types';
import { getApiHeaders } from '../hooks/storyEngineHelpers';

export const storyApi = {
  async generateBlueprint(intake: IntakeData, routingConfig: any): Promise<WorldBlueprint> {
    const apiHeaders = await getApiHeaders();
    const response = await fetch('/api/generate-blueprint', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ intake, routingConfig })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Blueprint generation failed: ${response.status}`);
    }
    return response.json();
  },

  async generateInitialArc(intake: IntakeData, blueprint: WorldBlueprint, chapterCount: number, routingConfig: any) {
    const apiHeaders = await getApiHeaders();
    const response = await fetch('/api/generate-initial-arc', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ intake, blueprint, chapterCount, routingConfig })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server bounds ruptured with status: ${response.status}`);
    }
    return response.json();
  },

  async generateCardImage(prompt: string, type: string, routingConfig: any) {
    const apiHeaders = await getApiHeaders();
    const response = await fetch('/api/generate-card-image', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ prompt, type, routingConfig })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to generate cover art.");
    }
    return data;
  },

  async checkConsistency(chapterText: string, memory: StoryMemory, routingConfig: any): Promise<string[]> {
    const apiHeaders = await getApiHeaders();
    const response = await fetch('/api/check-consistency', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({
        chapterText,
        memory,
        routingConfig
      })
    });

    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.warnings || [];
  }
};
