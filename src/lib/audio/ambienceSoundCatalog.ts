/**
 * Curated atmosphere-bed and narrative-cue sound catalog.
 *
 * Atmospheric beds are intentionally separate from World Card / World Echo
 * sounds. They are looping scene layers selected only from this catalog;
 * World Cards keep using cardSoundCatalog and the one-shot player.
 *
 * Add each approved loop here with its semantic tags. The selector does not
 * contain a parallel list of variations: it matches chapter/block metadata to
 * these tags, so adding a variation never requires changing playback logic.
 */

export interface CuratedAmbienceAsset {
  /** Stable semantic key, host-independent. */
  id: string;
  /** Curated asset URL (Cloudflare R2 / Celestial Library CDN). */
  url: string;
}

export const ATMOSPHERE_CATEGORIES = [
  'wind',
  'crowd',
  'waves',
  'rain',
  'combat',
  'noise',
] as const;

export type AtmosphereCategory = typeof ATMOSPHERE_CATEGORIES[number];

export interface CuratedAtmosphereBed extends CuratedAmbienceAsset {
  /** One of the six broad reader atmosphere layers. */
  category: AtmosphereCategory;
  /** Concrete scene descriptors supplied by chapter/block metadata. */
  tags: readonly string[];
}

export interface AtmosphereMetadata {
  sceneType?: string;
  environment?: string | readonly string[];
  motion?: string;
  emotion?: string;
  element?: string;
  signature?: string;
  audioSignature?: string;
  atmosphereTags?: readonly string[];
  theme?: string | readonly string[];
  music?: { mood?: string; region?: string };
}

export interface AtmosphereSelectionOptions {
  /** Scene changes require more evidence than an initial chapter choice. */
  minimumScore?: number;
  /** A reader-selected category may opt into any curated variation in it. */
  preferredCategory?: AtmosphereCategory;
  catalog?: readonly CuratedAtmosphereBed[];
}

/**
 * Populate with approved looping assets as the library grows. Do not add a
 * second resolver map for a variation; tags are its routing contract.
 */
export const ATMOSPHERE_BED_CATALOG: readonly CuratedAtmosphereBed[] = [];

const toTags = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap(item => typeof item === 'string'
    ? item.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    : []);
};

/** Extract only explicit semantic terms; numeric drama values never guess a bed. */
export function atmosphereMetadataTags(metadata?: AtmosphereMetadata | null): string[] {
  if (!metadata) return [];
  return [...new Set([
    ...toTags(metadata.sceneType),
    ...toTags(metadata.environment),
    ...toTags(metadata.motion),
    ...toTags(metadata.emotion),
    ...toTags(metadata.element),
    ...toTags(metadata.signature),
    ...toTags(metadata.audioSignature),
    ...toTags(metadata.atmosphereTags),
    ...toTags(metadata.theme),
    ...toTags(metadata.music?.mood),
    ...toTags(metadata.music?.region),
  ])];
}

/**
 * Finds the most specifically tagged curated bed. A catalog tag match is the
 * evidence for a choice; no match or an equal best match means
 * silence/keep the current bed rather than an inferred substitute.
 * `minimumScore: 2` is used for live switches.
 */
export function resolveAtmosphereBed(
  metadata?: AtmosphereMetadata | null,
  options: AtmosphereSelectionOptions = {},
): CuratedAtmosphereBed | null {
  const catalog = options.catalog ?? ATMOSPHERE_BED_CATALOG;
  const sourceTags = new Set(atmosphereMetadataTags(metadata));
  const candidates = options.preferredCategory
    ? catalog.filter(bed => bed.category === options.preferredCategory)
    : catalog;

  let selected: CuratedAtmosphereBed | null = null;
  let selectedScore = -1;
  let equallyMatched = false;
  for (const bed of candidates) {
    const matchingTags = new Set(toTags(bed.tags));
    const matchingScore = [...matchingTags].filter(tag => sourceTags.has(tag)).length;
    // The category itself is an explicit metadata tag when the author emits
    // it (for example `environment: ["rain"]`), not a hidden shortcut.
    const categoryMatch = sourceTags.has(bed.category) ? 2 : 0;
    const score = matchingScore + categoryMatch;
    if (score > selectedScore) {
      selected = bed;
      selectedScore = score;
      equallyMatched = false;
    } else if (score === selectedScore && score > 0) {
      equallyMatched = true;
    }
  }

  const minimumScore = options.minimumScore ?? 1;
  if (selected && selectedScore >= minimumScore && !equallyMatched) return selected;

  // A manual category selection is explicit user intent, so it may use the
  // first curated loop in that category even without scene metadata.
  return options.preferredCategory && candidates.length > 0 ? candidates[0] : null;
}

export type NarrativeCueName =
  | 'system_alert'
  | 'breakthrough'
  | 'artifact_activation'
  | 'beast_reveal'
  | 'fate_shift'
  | 'major_impact';

/** One-shot narrative cues remain a separate, non-looping catalog. */
export const NARRATIVE_CUE_CATALOG: Record<NarrativeCueName, string | null> = {
  system_alert: null,
  breakthrough: null,
  artifact_activation: null,
  beast_reveal: null,
  fate_shift: null,
  major_impact: null,
};

export function resolveNarrativeCueSound(name: string): CuratedAmbienceAsset | null {
  const url = NARRATIVE_CUE_CATALOG[name as NarrativeCueName];
  return url ? { id: `cue.${name}`, url } : null;
}
