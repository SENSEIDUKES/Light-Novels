import { WorldCardEvent, WorldCardSoundRole } from '../../types';
import { isDevBuild } from '../env';
import celestialLibraryCatalog from './celestial_library_catalog_cleaned.json';

/**
 * Curated World Card sound catalog.
 *
 * The World Card is the intentional, reader-driven place to hear an entity —
 * a living Pokédex button — so its sounds come from this small, manually
 * curated catalog only. Nothing here is procedurally generated, nothing is
 * API-generated, and chapter generation never picks filenames: a card's
 * audioType (its sound role) plus semantic hints resolve deterministically to
 * one curated asset URL, or to nothing (a visible "unavailable" state).
 *
 * Deliberately separate from the automatic narrative one-shot path
 * (narrative.fx.play + cinematicEffectGovernor): card playback consumes no
 * chapter cue budget, no governor dedupe state, and dispatches no cues.
 *
 * Future pro-tier / user-generated audio plugs in through `assetId` pins and
 * extra catalog entries — the resolver contract (card in, asset-or-null out)
 * stays the same, so the reader never has to change.
 */

export interface CuratedSoundAsset {
  /** Stable catalog key taken directly from the JSON file_path. */
  id: string;
  /** Which card entity types this asset can serve. */
  entityTypes: WorldCardEvent['entityType'][];
  role: WorldCardSoundRole;
  /** Source catalog category and variation used during candidate matching. */
  category: string;
  variation: string;
  /** Source soft_tags plus filename/folder words used for semantic scoring. */
  tags: string[];
  /** Original source soft_tags, retained so their stronger weight is preserved. */
  sourceTags: string[];
  /** Words derived from the exact catalog file_path. */
  pathTags: string[];
  /** Exact public_url supplied by the catalog. */
  url: string;
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

const ENTITY_TYPES_BY_CATEGORY: Record<string, WorldCardEvent['entityType'][]> = {
  beasts: ['creature'],
  weapons: ['artifact'],
  artifacts: ['artifact'],
  locations: ['location'],
  factions: ['faction'],
  system: ['system', 'fate_event'],
};

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

function normalizedPathTags(filePath: string): string[] {
  const withoutExtension = filePath.replace(/\.[^./\\]+$/, '');
  return withoutExtension
    .split(/[^a-z0-9]+/i)
    .map((tag) => tag.toLowerCase())
    .filter((tag) => tag && !/^\d+$/.test(tag));
}

function catalogRole(entry: CelestialLibraryCatalogEntry): WorldCardSoundRole | null {
  const category = normalizedString(entry.metadata?.main_category);
  const variation = normalizedString(entry.metadata?.broad_variation);
  if (!category || !variation) return null;

  if (category === 'beasts') {
    if (variation === 'growl') return 'roar';
    if (['call', 'hiss', 'howl', 'roar', 'screech', 'wingbeat'].includes(variation)) {
      return variation as WorldCardSoundRole;
    }
  }
  if (category === 'weapons') {
    if (variation === 'unsheathe') return 'unsheathe';
    if (variation === 'electric') return 'activation_hum';
    if (variation === 'magic') return 'magical_activation';
    if (variation === 'reload') return 'metallic_ring';
  }
  if (category === 'artifacts') {
    if (variation === 'activation') return 'magical_activation';
    if (variation === 'upgrade') return 'awakening';
    if (variation === 'relics') {
      return typeof entry.file_path === 'string' && entry.file_path.toLowerCase().includes('/pulse/')
        ? 'pulse'
        : 'resonance';
    }
  }
  if (category === 'locations' && variation === 'signatures') return 'signature';
  if (category === 'factions') return 'chant';
  if (category === 'system') return 'chime';
  return null;
}

export function buildCardSoundLibrary(
  entries: readonly CelestialLibraryCatalogEntry[],
): CuratedSoundAsset[] {
  return entries.flatMap((entry) => {
    const category = normalizedString(entry.metadata?.main_category);
    const variation = normalizedString(entry.metadata?.broad_variation);
    const id = typeof entry.file_path === 'string' ? entry.file_path : null;
    const url = typeof entry.public_url === 'string' ? entry.public_url : null;
    const entityTypes = category ? ENTITY_TYPES_BY_CATEGORY[category] : undefined;
    const role = catalogRole(entry);
    if (!category || !variation || !id || !url || !entityTypes || !role) return [];
    const sourceTags = normalizedTags(entry.metadata?.soft_tags);
    const pathTags = normalizedPathTags(id);

    return [{
      id,
      entityTypes,
      role,
      category,
      variation,
      tags: [...new Set([...sourceTags, ...pathTags])],
      sourceTags,
      pathTags,
      url,
    }];
  });
}

export const CARD_SOUND_LIBRARY = buildCardSoundLibrary(
  celestialLibraryCatalog as CelestialLibraryCatalogEntry[],
);

// Near-synonym audioType values older content or the LLM may emit.
const ROLE_ALIASES: Record<string, WorldCardSoundRole> = {
  ring: 'metallic_ring',
  hum: 'activation_hum',
  activation: 'magical_activation',
  cry: 'call',
  shriek: 'screech',
  growl: 'roar',
};

const WORLD_CARD_SOUND_ROLES: WorldCardSoundRole[] = [
  'roar',
  'call',
  'hiss',
  'howl',
  'screech',
  'wingbeat',
  'unsheathe',
  'metallic_ring',
  'activation_hum',
  'resonance',
  'awakening',
  'pulse',
  'magical_activation',
  'signature',
  'chant',
  'chime',
];

export function resolveCardSoundRole(audioType: string): WorldCardSoundRole | null {
  if (audioType === 'tts_line') return null;
  if (WORLD_CARD_SOUND_ROLES.includes(audioType as WorldCardSoundRole)) {
    return audioType as WorldCardSoundRole;
  }
  return ROLE_ALIASES[audioType] ?? null;
}

// Descriptor words expanded into the tag vocabulary so entity names like
// "Colossal Primordial Thunder Serpent" hit size/element tags directly.
const TOKEN_EXPANSIONS: Record<string, string[]> = {
  giant: ['large'],
  'world-scale': ['large'],
  colossal: ['large'],
  huge: ['large'],
  massive: ['large'],
  titanic: ['large'],
  primordial: ['ancient'],
  elder: ['ancient'],
  boss: ['ancient', 'large'],
  calamity: ['ancient', 'large'],
  mythic: ['ancient', 'large'],
  thunder: ['lightning'],
  storm: ['lightning'],
  flame: ['fire'],
  inferno: ['fire'],
  holy: ['celestial'],
  divine: ['celestial'],
  heavenly: ['celestial'],
  shadow: ['dark'],
  demonic: ['dark'],
};

function addTokens(tokens: Set<string>, values: Array<string | undefined>) {
  const rawTokens = values
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(Boolean);

  for (const token of rawTokens) {
    tokens.add(token);
    // Catalog categories/variations are plural while model hints are often
    // singular (artifact/artifacts, signature/signatures, etc.).
    if (token.length > 3 && token.endsWith('s')) tokens.add(token.slice(0, -1));
    for (const expanded of TOKEN_EXPANSIONS[token] ?? []) tokens.add(expanded);
  }
}

function tokenize(card: Pick<WorldCardEvent, 'entityName' | 'displayTitle' | 'sound'>): Set<string> {
  const hints = card.sound;
  const tokens = new Set<string>();
  addTokens(tokens, [
    card.entityName,
    card.displayTitle,
    hints?.element,
    hints?.size,
    hints?.threatTier,
    hints?.weaponType,
    hints?.artifactCategory,
    ...(hints?.tags ?? []),
  ]);
  return tokens;
}

type UnresolvedListener = (card: WorldCardEvent, reason: 'unknown-role' | 'no-catalog-match') => void;
let unresolvedListener: UnresolvedListener | null = null;
const reportedUnresolved = new Set<string>();

/** Test/curation hook: observe cards whose sound could not be resolved. */
export function setUnresolvedCardSoundListener(listener: UnresolvedListener | null) {
  unresolvedListener = listener;
  reportedUnresolved.clear();
}

function reportUnresolved(card: WorldCardEvent, reason: 'unknown-role' | 'no-catalog-match') {
  unresolvedListener?.(card, reason);
  // Lightweight curation logging: one line per missing mapping, deduplicated,
  // dev builds only — enough to notice a gap, not an analytics system.
  const key = `${card.entityType}:${card.audioType}:${card.entityName}`;
  if (!reportedUnresolved.has(key)) {
    reportedUnresolved.add(key);
    if (isDevBuild()) {
      console.info(`[card-sound] no curated asset for ${key} (${reason})`);
    }
  }
}

/**
 * Resolve a World Card to its curated sound asset, or null when no approved
 * asset exists. Never guesses outside the catalog and never generates —
 * a null result must surface as a visible "unavailable" state on the card.
 */
export function resolveCardSound(card: WorldCardEvent): CuratedSoundAsset | null {
  const role = resolveCardSoundRole(card.audioType);
  if (!role) {
    if (card.audioType !== 'tts_line') reportUnresolved(card, 'unknown-role');
    return null;
  }

  const exclusiveRole = card.entityType === 'location'
    ? 'signature'
    : card.entityType === 'faction'
      ? 'chant'
      : null;
  if (exclusiveRole && role !== exclusiveRole) {
    reportUnresolved(card, 'no-catalog-match');
    return null;
  }

  // A pin bypasses semantic scoring but cannot cross entity boundaries. The
  // JSON file_path is the stable asset id and public_url remains the payload.
  if (card.sound?.assetId) {
    const pinned = CARD_SOUND_LIBRARY.find(
      (a) => a.id === card.sound?.assetId && a.entityTypes.includes(card.entityType),
    );
    if (pinned) return pinned;
  }

  const candidates = CARD_SOUND_LIBRARY.filter(
    (a) => a.role === role && a.entityTypes.includes(card.entityType),
  );
  if (candidates.length === 0) {
    reportUnresolved(card, 'no-catalog-match');
    return null;
  }

  const tokens = tokenize(card);
  let best = candidates[0];
  let bestScore = -1;
  for (const asset of candidates) {
    let score = 0;
    const catalogTerms = new Set<string>();
    const sourceTagTerms = new Set<string>();
    const pathTagTerms = new Set<string>();
    addTokens(catalogTerms, [asset.category, asset.variation]);
    addTokens(sourceTagTerms, asset.sourceTags);
    addTokens(pathTagTerms, asset.pathTags);
    for (const term of catalogTerms) if (tokens.has(term)) score += 1;
    for (const term of sourceTagTerms) if (tokens.has(term)) score += 2;
    for (const term of pathTagTerms) if (tokens.has(term)) score += 2;
    // Strict '>' keeps source JSON order as the deterministic tiebreaker.
    if (score > bestScore) {
      bestScore = score;
      best = asset;
    }
  }
  return best;
}
