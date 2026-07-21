/**
 * Curated atmosphere-bed and narrative-cue sound catalog.
 *
 * Nothing in the reader's ambient layer is generated: every atmosphere bed
 * (rain, wind, …) maps to an entry in the Celestial Library catalog. This is
 * deliberately separate from World Card audio even though both systems read
 * the same source file.
 *
 * Future user-generated world sounds plug in as extra catalog entries /
 * per-story overrides; the resolver contract (name in, asset-or-null out)
 * stays the same.
 */

import celestialLibraryCatalog from './celestial_library_catalog_cleaned.json';

export interface CuratedAmbienceAsset {
  /** Stable catalog key taken directly from the JSON file_path. */
  id: string;
  /** Exact public_url supplied by the catalog. */
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

export type AtmosphereBedName = (typeof ATMOSPHERE_CATEGORIES)[number];

export interface CuratedAtmosphereBed extends CuratedAmbienceAsset {
  category: 'atmosphere';
  variation: AtmosphereBedName;
  tags: string[];
}

export interface CelestialLibraryCatalogEntry {
  file_path?: unknown;
  public_url?: unknown;
  metadata?: {
    main_category?: unknown;
    broad_variation?: unknown;
    soft_tags?: unknown;
  } | null;
}

export type NarrativeCueName =
  | 'system_alert'
  | 'breakthrough'
  | 'artifact_activation'
  | 'beast_reveal'
  | 'fate_shift'
  | 'major_impact';

function normalizedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.toLowerCase()
    : null;
}

function normalizedTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((tag) => {
      const normalized = normalizedString(tag);
      return normalized ? [normalized] : [];
    })
    : [];
}

export function buildAtmosphereBedCatalog(
  entries: readonly CelestialLibraryCatalogEntry[],
): CuratedAtmosphereBed[] {
  return entries.flatMap((entry) => {
    const category = normalizedString(entry.metadata?.main_category);
    const variation = normalizedString(entry.metadata?.broad_variation);
    const id = typeof entry.file_path === 'string' ? entry.file_path : null;
    const url = typeof entry.public_url === 'string' ? entry.public_url : null;
    if (
      !category ||
      !variation ||
      !id ||
      !url ||
      category !== 'atmosphere' ||
      !ATMOSPHERE_CATEGORIES.includes(variation as AtmosphereBedName)
    ) {
      return [];
    }

    return [{
      id,
      category: 'atmosphere' as const,
      variation: variation as AtmosphereBedName,
      tags: normalizedTags(entry.metadata?.soft_tags),
      url,
    }];
  });
}

/** All atmosphere entries from the shared catalog; World Cards exclude them. */
export const ATMOSPHERE_BED_CATALOG = buildAtmosphereBedCatalog(
  celestialLibraryCatalog as CelestialLibraryCatalogEntry[],
);

/**
 * One-shot story cues (narrative.fx.play), played through the shared curated
 * one-shot player. URL slots are filled from the curated R2 sound list.
 */
export const NARRATIVE_CUE_CATALOG: Record<NarrativeCueName, string | null> = {
  system_alert: null,
  breakthrough: null,
  artifact_activation: null,
  beast_reveal: null,
  fate_shift: null,
  major_impact: null,
};

const ATMOSPHERE_ALIASES: Record<string, AtmosphereBedName> = {
  ocean: 'waves',
  sea: 'waves',
  water: 'waves',
};

function addTokens(tokens: Set<string>, values: string[]) {
  for (const value of values) {
    for (const token of value.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean)) {
      tokens.add(token);
      for (const part of token.split('-')) if (part) tokens.add(part);
    }
  }
}

/**
 * Resolve a scene atmosphere category and semantic tags to one real catalog
 * track. Category + variation select the candidate set; soft_tags rank it.
 */
export function resolveAtmosphereBed(
  name: string,
  semanticTags: string[] = [],
): CuratedAtmosphereBed | null {
  const normalizedName = name.toLowerCase();
  const variation = ATMOSPHERE_ALIASES[normalizedName] ?? normalizedName;
  if (!ATMOSPHERE_CATEGORIES.includes(variation as AtmosphereBedName)) return null;

  const candidates = ATMOSPHERE_BED_CATALOG.filter(
    (asset) => asset.category === 'atmosphere' && asset.variation === variation,
  );
  if (candidates.length === 0) return null;

  const sceneTokens = new Set<string>();
  addTokens(sceneTokens, [normalizedName, variation, ...semanticTags]);

  let best = candidates[0];
  let bestScore = -1;
  for (const asset of candidates) {
    const assetTokens = new Set<string>();
    addTokens(assetTokens, [asset.category, asset.variation, ...asset.tags]);
    let score = 0;
    for (const token of assetTokens) if (sceneTokens.has(token)) score += 1;
    // Strict '>' preserves source JSON order as a deterministic tiebreaker.
    if (score > bestScore) {
      bestScore = score;
      best = asset;
    }
  }
  return best;
}

export function resolveNarrativeCueSound(name: string): CuratedAmbienceAsset | null {
  const url = NARRATIVE_CUE_CATALOG[name as NarrativeCueName];
  return url ? { id: `cue.${name}`, url } : null;
}
