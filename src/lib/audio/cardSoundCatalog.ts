import { WorldCardEvent, WorldCardSoundRole } from '../../types';
import { isDevBuild } from '../env';

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
  /** Semantic key, e.g. 'beast.large.roar.lightning'. Stable across hosts. */
  id: string;
  /** Which card entity types this asset can serve. */
  entityTypes: WorldCardEvent['entityType'][];
  role: WorldCardSoundRole;
  /** Semantic matching tags: size, threat tier, element, weapon type, etc. */
  tags: string[];
  /** Curated asset URL on the Celestial Library CDN. */
  url: string;
}

// Same host family as the scene-score TRACK_LIBRARY. Swapping this base is
// all a future R2 migration needs — asset ids are host-independent.
const SFX_CDN = 'https://celestialaudio.seihouse.org/AUDIO/SFX';

const beast = ['creature'] as WorldCardEvent['entityType'][];
const gear = ['artifact'] as WorldCardEvent['entityType'][];
const place = ['location'] as WorldCardEvent['entityType'][];
const faction = ['faction'] as WorldCardEvent['entityType'][];

// Generic per-role entries come FIRST so a card with no matching semantics
// resolves to the neutral asset instead of a situational sibling (ties in
// the score never dethrone an earlier entry).
export const CARD_SOUND_LIBRARY: CuratedSoundAsset[] = [
  // --- Beast ---
  { id: 'beast.generic.roar', entityTypes: beast, role: 'roar', tags: [], url: `${SFX_CDN}/BEAST/GENERIC_ROAR.mp3` },
  { id: 'beast.large.roar.lightning', entityTypes: beast, role: 'roar', tags: ['large', 'ancient', 'lightning', 'thunder', 'storm'], url: `${SFX_CDN}/BEAST/LARGE_ROAR_LIGHTNING.mp3` },
  { id: 'beast.large.roar.fire', entityTypes: beast, role: 'roar', tags: ['large', 'fire', 'flame', 'dragon', 'drake'], url: `${SFX_CDN}/BEAST/LARGE_ROAR_FIRE.mp3` },
  { id: 'beast.generic.call', entityTypes: beast, role: 'call', tags: [], url: `${SFX_CDN}/BEAST/GENERIC_CALL.mp3` },
  { id: 'beast.spirit.call.void', entityTypes: beast, role: 'call', tags: ['spirit', 'ghost', 'void', 'ethereal', 'undead'], url: `${SFX_CDN}/BEAST/SPIRIT_CALL_VOID.mp3` },
  { id: 'beast.generic.hiss', entityTypes: beast, role: 'hiss', tags: [], url: `${SFX_CDN}/BEAST/GENERIC_HISS.mp3` },
  { id: 'beast.serpent.hiss.poison', entityTypes: beast, role: 'hiss', tags: ['serpent', 'snake', 'naga', 'poison', 'venom'], url: `${SFX_CDN}/BEAST/SERPENT_HISS_POISON.mp3` },
  { id: 'beast.generic.howl', entityTypes: beast, role: 'howl', tags: [], url: `${SFX_CDN}/BEAST/GENERIC_HOWL.mp3` },
  { id: 'beast.wolf.howl.moon', entityTypes: beast, role: 'howl', tags: ['wolf', 'moon', 'pack', 'night'], url: `${SFX_CDN}/BEAST/WOLF_HOWL_MOON.mp3` },
  { id: 'beast.generic.screech', entityTypes: beast, role: 'screech', tags: [], url: `${SFX_CDN}/BEAST/GENERIC_SCREECH.mp3` },
  { id: 'beast.bird.screech.sky', entityTypes: beast, role: 'screech', tags: ['bird', 'hawk', 'eagle', 'phoenix', 'sky'], url: `${SFX_CDN}/BEAST/BIRD_SCREECH_SKY.mp3` },
  { id: 'beast.generic.wingbeat', entityTypes: beast, role: 'wingbeat', tags: [], url: `${SFX_CDN}/BEAST/GENERIC_WINGBEAT.mp3` },
  { id: 'beast.large.wingbeat.storm', entityTypes: beast, role: 'wingbeat', tags: ['large', 'ancient', 'dragon', 'roc', 'storm'], url: `${SFX_CDN}/BEAST/LARGE_WINGBEAT_STORM.mp3` },

  // --- Weapon (weapons are artifact-type cards) ---
  { id: 'weapon.generic.unsheathe', entityTypes: gear, role: 'unsheathe', tags: [], url: `${SFX_CDN}/WEAPON/GENERIC_UNSHEATHE.mp3` },
  { id: 'weapon.sword.unsheathe.celestial', entityTypes: gear, role: 'unsheathe', tags: ['sword', 'blade', 'celestial', 'holy', 'divine', 'light'], url: `${SFX_CDN}/WEAPON/SWORD_UNSHEATHE_CELESTIAL.mp3` },
  { id: 'weapon.saber.unsheathe', entityTypes: gear, role: 'unsheathe', tags: ['saber', 'dao', 'curved'], url: `${SFX_CDN}/WEAPON/SABER_UNSHEATHE.mp3` },
  { id: 'weapon.generic.metallic_ring', entityTypes: gear, role: 'metallic_ring', tags: [], url: `${SFX_CDN}/WEAPON/GENERIC_METALLIC_RING.mp3` },
  { id: 'weapon.sword.metallic_ring.jade', entityTypes: gear, role: 'metallic_ring', tags: ['sword', 'blade', 'jade'], url: `${SFX_CDN}/WEAPON/SWORD_METALLIC_RING_JADE.mp3` },
  { id: 'weapon.generic.swing', entityTypes: gear, role: 'swing', tags: [], url: `${SFX_CDN}/WEAPON/GENERIC_SWING.mp3` },
  { id: 'weapon.spear.swing.wind', entityTypes: gear, role: 'swing', tags: ['spear', 'lance', 'halberd', 'wind'], url: `${SFX_CDN}/WEAPON/SPEAR_SWING_WIND.mp3` },
  { id: 'weapon.generic.impact', entityTypes: gear, role: 'impact', tags: [], url: `${SFX_CDN}/WEAPON/GENERIC_IMPACT.mp3` },
  { id: 'weapon.hammer.impact.earth', entityTypes: gear, role: 'impact', tags: ['hammer', 'maul', 'earth', 'mountain'], url: `${SFX_CDN}/WEAPON/HAMMER_IMPACT_EARTH.mp3` },
  { id: 'weapon.generic.activation_hum', entityTypes: gear, role: 'activation_hum', tags: [], url: `${SFX_CDN}/WEAPON/GENERIC_ACTIVATION_HUM.mp3` },
  { id: 'weapon.sword.activation_hum.lightning', entityTypes: gear, role: 'activation_hum', tags: ['sword', 'blade', 'lightning', 'thunder'], url: `${SFX_CDN}/WEAPON/SWORD_ACTIVATION_HUM_LIGHTNING.mp3` },

  // --- Artifact / relic ---
  { id: 'artifact.generic.resonance', entityTypes: gear, role: 'resonance', tags: [], url: `${SFX_CDN}/ARTIFACT/GENERIC_RESONANCE.mp3` },
  { id: 'artifact.jade.resonance', entityTypes: gear, role: 'resonance', tags: ['jade', 'pendant', 'talisman', 'bead'], url: `${SFX_CDN}/ARTIFACT/JADE_RESONANCE.mp3` },
  { id: 'artifact.generic.awakening', entityTypes: gear, role: 'awakening', tags: [], url: `${SFX_CDN}/ARTIFACT/GENERIC_AWAKENING.mp3` },
  { id: 'artifact.relic.awakening.sealed', entityTypes: gear, role: 'awakening', tags: ['relic', 'sealed', 'seal', 'ancient', 'forbidden'], url: `${SFX_CDN}/ARTIFACT/RELIC_AWAKENING_SEALED.mp3` },
  { id: 'artifact.generic.pulse', entityTypes: gear, role: 'pulse', tags: [], url: `${SFX_CDN}/ARTIFACT/GENERIC_PULSE.mp3` },
  { id: 'artifact.core.pulse.void', entityTypes: gear, role: 'pulse', tags: ['core', 'void', 'dark', 'abyss'], url: `${SFX_CDN}/ARTIFACT/CORE_PULSE_VOID.mp3` },
  { id: 'artifact.generic.magical_activation', entityTypes: gear, role: 'magical_activation', tags: [], url: `${SFX_CDN}/ARTIFACT/GENERIC_MAGICAL_ACTIVATION.mp3` },
  { id: 'artifact.formation.magical_activation', entityTypes: gear, role: 'magical_activation', tags: ['formation', 'array', 'rune', 'glyph', 'circle'], url: `${SFX_CDN}/ARTIFACT/FORMATION_MAGICAL_ACTIVATION.mp3` },

  // --- Location ---
  { id: 'location.generic.ambience', entityTypes: place, role: 'ambience', tags: [], url: `${SFX_CDN}/LOCATION/GENERIC_AMBIENCE.mp3` },
  { id: 'location.forest.ambience', entityTypes: place, role: 'ambience', tags: ['forest', 'woods', 'jungle', 'grove'], url: `${SFX_CDN}/LOCATION/FOREST_AMBIENCE.mp3` },
  { id: 'location.city.ambience', entityTypes: place, role: 'ambience', tags: ['city', 'market', 'town', 'capital', 'street'], url: `${SFX_CDN}/LOCATION/CITY_AMBIENCE.mp3` },
  { id: 'location.cavern.ambience', entityTypes: place, role: 'ambience', tags: ['cave', 'cavern', 'underground', 'abyss', 'tomb'], url: `${SFX_CDN}/LOCATION/CAVERN_AMBIENCE.mp3` },
  { id: 'location.generic.signature', entityTypes: place, role: 'signature', tags: [], url: `${SFX_CDN}/LOCATION/GENERIC_SIGNATURE.mp3` },
  // Sects live in both the location and faction sections of the codex.
  { id: 'location.sect.mountain.signature', entityTypes: ['location', 'faction'], role: 'signature', tags: ['sect', 'mountain', 'peak', 'summit', 'monastery'], url: `${SFX_CDN}/LOCATION/SECT_MOUNTAIN_SIGNATURE.mp3` },
  { id: 'location.palace.signature', entityTypes: place, role: 'signature', tags: ['palace', 'imperial', 'throne', 'hall'], url: `${SFX_CDN}/LOCATION/PALACE_SIGNATURE.mp3` },

  // --- Faction / ritual ---
  { id: 'faction.generic.chant', entityTypes: faction, role: 'chant', tags: [], url: `${SFX_CDN}/FACTION/GENERIC_CHANT.mp3` },
  { id: 'faction.ritual.chant.dark', entityTypes: faction, role: 'chant', tags: ['dark', 'demonic', 'blood', 'forbidden', 'cult'], url: `${SFX_CDN}/FACTION/RITUAL_CHANT_DARK.mp3` },
  { id: 'faction.generic.horn', entityTypes: faction, role: 'horn', tags: [], url: `${SFX_CDN}/FACTION/GENERIC_HORN.mp3` },
  { id: 'faction.war.horn', entityTypes: faction, role: 'horn', tags: ['war', 'army', 'battle', 'legion', 'siege'], url: `${SFX_CDN}/FACTION/WAR_HORN.mp3` },
  { id: 'faction.generic.bell', entityTypes: faction, role: 'bell', tags: [], url: `${SFX_CDN}/FACTION/GENERIC_BELL.mp3` },
  { id: 'faction.temple.bell', entityTypes: ['faction', 'location'], role: 'bell', tags: ['temple', 'monastery', 'sect', 'dawn'], url: `${SFX_CDN}/FACTION/TEMPLE_BELL.mp3` },
  { id: 'faction.generic.ceremony', entityTypes: faction, role: 'ceremony', tags: [], url: `${SFX_CDN}/FACTION/GENERIC_CEREMONY.mp3` },

  // --- System ---
  { id: 'system.generic.chime', entityTypes: ['system', 'fate_event'], role: 'chime', tags: [], url: `${SFX_CDN}/SYSTEM/GENERIC_CHIME.mp3` },
];

// Near-synonym audioType values older content or the LLM may emit.
const ROLE_ALIASES: Record<string, WorldCardSoundRole> = {
  ring: 'metallic_ring',
  hum: 'activation_hum',
  activation: 'magical_activation',
  ceremonial: 'ceremony',
  ambient: 'ambience',
  cry: 'call',
  shriek: 'screech',
  growl: 'roar',
};

export function resolveCardSoundRole(audioType: string): WorldCardSoundRole | null {
  if (audioType === 'tts_line') return null;
  if (CARD_SOUND_LIBRARY.some((a) => a.role === audioType)) {
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

function tokenize(card: Pick<WorldCardEvent, 'entityName' | 'displayTitle' | 'sound'>): Set<string> {
  const hints = card.sound;
  const raw = [
    card.entityName,
    card.displayTitle,
    hints?.element,
    hints?.size,
    hints?.threatTier,
    hints?.weaponType,
    hints?.artifactCategory,
    ...(hints?.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const tokens = new Set(raw.split(/[^a-z0-9-]+/).filter(Boolean));
  for (const token of [...tokens]) {
    for (const expanded of TOKEN_EXPANSIONS[token] ?? []) {
      tokens.add(expanded);
    }
  }
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
  // Explicit curated pin wins outright (also the future pro-tier entry point:
  // extra entries + a pinned assetId, same reader contract).
  if (card.sound?.assetId) {
    const pinned = CARD_SOUND_LIBRARY.find((a) => a.id === card.sound?.assetId);
    if (pinned) return pinned;
  }

  const role = resolveCardSoundRole(card.audioType);
  if (!role) {
    if (card.audioType !== 'tts_line') reportUnresolved(card, 'unknown-role');
    return null;
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
    for (const tag of asset.tags) {
      if (tokens.has(tag)) score += 2;
    }
    // Strict '>' keeps catalog order as the tiebreaker: generic entries come
    // first per role, so a card with no semantic overlap stays generic.
    if (score > bestScore) {
      bestScore = score;
      best = asset;
    }
  }
  return best;
}
