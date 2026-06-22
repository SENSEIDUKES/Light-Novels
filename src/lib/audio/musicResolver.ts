import { StoryBlockMetadata } from '../../types';

export interface SceneAudioTrack {
  id: string;          // e.g., 'FIGHTING_1_TOURNAMENT', 'BOSS_FIGHT_1_FINAL_BOSS'
  mood: string;        // 'fighting', 'boss-fight', 'adventure', etc.
  tags: string[];      // Context matching tags (e.g., 'tournament', 'cave')
  url: string;         // Cloudflare R2 string link
  isPremium: boolean;  // Mark user-generated or premium track explicitly
}

// 1. Priority Map
// When multiple narrative blocks occur in the same chapter or scene window, 
// the Highest Priority mood takes over the soundscape. 
export const MOOD_PRIORITIES: Record<string, number> = {
  'boss-fight': 100,
  'tragedy': 95,
  'fighting': 90,
  'duel': 88,
  'war': 85,
  'triumph': 80,
  'horror': 75,
  'dread': 72,
  'tension': 70,
  'excitement': 65,
  'tribulation': 60,
  'adventure': 50,
  'mystery': 40,
  'travel': 30,
  'romance': 25,
  'sad': 20,
  'mystical': 15,
  'serenity': 10,
  'ambient': 5,
  'tired': 1,
};

// 2. Dummy Skeleton Library 
// You will replace this with your dynamic fetch to Cloudflare when ready
export const TRACK_LIBRARY: SceneAudioTrack[] = Object.keys(MOOD_PRIORITIES).map((mood, idx) => ({
  id: `${mood.toUpperCase().replace('-', '_')}_1_DEFAULT`,
  mood,
  tags: ['default'],
  url: '', 
  isPremium: false,
}));

// 3. Audio Resolution Controller
export class SceneScoreEngine {
  private currentTrackId: string | null = null;
  private currentPriority: number = -1;

  public evaluateSceneContext(
    musicMeta: StoryBlockMetadata['music'], 
    sceneTags: string[] = []
  ): SceneAudioTrack | null {
    if (!musicMeta) return null;

    const requestedMood = musicMeta.mood;
    const moodPriority = MOOD_PRIORITIES[requestedMood] || 0;

    // RULE 1: STRICT OVERRIDE PRIORITY
    // Only switch tracks if the new narrative cue has a higher or equal priority 
    // to the currently playing track. (e.g., Boss Fight overrides Adventure)
    if (moodPriority < this.currentPriority) {
        return null; // Ignore lower priority background noise once tension is escalated
    }

    // RULE 2: SPECIFIC TRACK OVERRIDE
    // If LLM or user manually requests a specific custom premium track ID, immediately respect it.
    if (musicMeta.trackId) {
      const explicitTrack = TRACK_LIBRARY.find(t => t.id === musicMeta.trackId);
      if (explicitTrack) {
        this.updateState(explicitTrack.id, moodPriority);
        return explicitTrack;
      }
    }

    // RULE 3: CONTEXT MATCHING
    // Find tracks matching mood. If multiple match, score them against scene environment tags.
    const candidates = TRACK_LIBRARY.filter(t => t.mood === requestedMood);
    
    if (candidates.length === 0) return null;

    let bestMatch = candidates[0];
    let highestScore = -1;

    for (const track of candidates) {
      let score = 0;
      // Boost score based on overlapping tags (e.g. ['cave', 'dark'] intersecting with scene tags)
      for (const tag of track.tags) {
        if (sceneTags.includes(tag)) score += 2;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = track;
      }
    }

    this.updateState(bestMatch.id, moodPriority);
    return bestMatch;
  }

  // Gracefully drop priority (e.g., moving to the next chapter) so lower priority songs can play again
  public resetScene() {
    this.currentTrackId = null;
    this.currentPriority = -1;
  }

  private updateState(trackId: string, priority: number) {
    this.currentTrackId = trackId;
    this.currentPriority = priority;
  }
}
