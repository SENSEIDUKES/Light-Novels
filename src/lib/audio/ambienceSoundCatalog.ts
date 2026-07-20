/**
 * Curated atmosphere-bed and narrative-cue sound catalog.
 *
 * Nothing in the reader's ambient layer is generated: every atmosphere bed
 * (rain, wind, …) and every one-shot story cue maps to a manually curated
 * asset URL, exactly like the World Card catalog. The R2-hosted URLs are
 * dropped into the maps below as the curated library is finalized — an entry
 * that is still `null` simply plays nothing (the layer stays silent), so
 * shipping ahead of the full sound list is safe.
 *
 * Future user-generated world sounds plug in as extra catalog entries /
 * per-story overrides; the resolver contract (name in, asset-or-null out)
 * stays the same.
 */

export interface CuratedAmbienceAsset {
  /** Stable semantic key, host-independent. */
  id: string;
  /** Curated asset URL (Cloudflare R2 / Celestial Library CDN). */
  url: string;
}

export type AtmosphereBedName = 'wind' | 'rain' | 'ocean' | 'crowd' | 'combat';

export type NarrativeCueName =
  | 'system_alert'
  | 'breakthrough'
  | 'artifact_activation'
  | 'beast_reveal'
  | 'fate_shift'
  | 'major_impact';

/**
 * Looping atmosphere beds, played through the SAP scene-mix engine.
 * URL slots are filled from the curated R2 sound list.
 */
export const ATMOSPHERE_BED_CATALOG: Record<AtmosphereBedName, string | null> = {
  wind: null,
  rain: null,
  ocean: null,
  crowd: null,
  combat: null,
};

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

export function resolveAtmosphereBed(name: string): CuratedAmbienceAsset | null {
  const url = ATMOSPHERE_BED_CATALOG[name as AtmosphereBedName];
  return url ? { id: `atmosphere.${name}`, url } : null;
}

export function resolveNarrativeCueSound(name: string): CuratedAmbienceAsset | null {
  const url = NARRATIVE_CUE_CATALOG[name as NarrativeCueName];
  return url ? { id: `cue.${name}`, url } : null;
}
