import { secureStorage } from '../lib/encryption';
import { StoryMemory } from '../types';

export const getApiHeaders = async () => {
  const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  const gemini = await secureStorage.getItem('@seihouse/api-key-gemini');
  const openrouter = await secureStorage.getItem('@seihouse/api-key-openrouter');
  const ollama = await secureStorage.getItem('@seihouse/api-key-ollama-host');
  if (gemini) apiHeaders['x-gemini-key'] = gemini;
  if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
  if (ollama) apiHeaders['x-ollama-host'] = ollama;
  return apiHeaders;
};

// A chapter block is renderable when it carries prose text OR a structured
// visual payload (system panel / world card) that the reader renders on its
// own — models sometimes emit standalone system blocks with no prose text,
// and those must not be silently dropped.
const isRenderableBlock = (obj: any): boolean =>
  !!obj && (
    typeof obj.text === 'string' ||
    typeof obj.content === 'string' ||
    (obj.system && typeof obj.system === 'object') ||
    (obj.worldCard && typeof obj.worldCard === 'object')
  );

const GENERATED_SOUND_HINT_FIELDS = [
  'element',
  'size',
  'threatTier',
  'weaponType',
  'artifactCategory',
] as const;

const isSemanticHint = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0
    && !/[\\/]/.test(trimmed)
    && !/\\.(?:mp3|wav|ogg)$/i.test(trimmed);
};

// Generated World Cards choose by meaning, never by catalog identity. Pins
// remain available to authored cards elsewhere in the app, but model output
// is reduced to the semantic portion of the contract at the parse boundary.
const normalizeGeneratedWorldCard = (worldCard: any) => {
  if (!worldCard || typeof worldCard !== 'object' || Array.isArray(worldCard) || !('sound' in worldCard)) {
    return worldCard;
  }

  const { sound: rawSound, ...card } = worldCard;
  if (!rawSound || typeof rawSound !== 'object' || Array.isArray(rawSound)) return card;

  const sound: Record<string, string | string[]> = {};
  for (const field of GENERATED_SOUND_HINT_FIELDS) {
    if (isSemanticHint(rawSound[field])) sound[field] = rawSound[field].trim();
  }
  if (rawSound.assetFamily === 'weapon' || rawSound.assetFamily === 'relic') {
    sound.assetFamily = rawSound.assetFamily;
  }
  if (Array.isArray(rawSound.tags)) {
    const tags = rawSound.tags.filter(isSemanticHint).map((tag: string) => tag.trim());
    if (tags.length > 0) sound.tags = tags;
  }

  return Object.keys(sound).length > 0 ? { ...card, sound } : card;
};

const normalizeBlockText = (b: any) => ({
  ...b,
  ...(b.worldCard ? { worldCard: normalizeGeneratedWorldCard(b.worldCard) } : {}),
  text: typeof b.text === 'string' && b.text ? b.text : (typeof b.content === 'string' ? b.content : (b.text ?? '')),
});

export const extractJsonBlocks = (rawStr: string): any[] => {
  try {
    const arrayMatch = rawStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
       const parsed = JSON.parse(arrayMatch[0]);
       if (Array.isArray(parsed) && parsed.length > 0 && isRenderableBlock(parsed[0])) {
          return parsed.map(normalizeBlockText);
       }
    }
  } catch {}

  const blocks: any[] = [];
  const lines = rawStr.split('\n');
  for (const l of lines) {
    const trimmed = l.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        if (isRenderableBlock(obj)) {
          blocks.push(normalizeBlockText(obj));
        }
      } catch {}
    }
  }
  if (blocks.length > 0) return blocks;

  const braceBlocks: any[] = [];
  let depth = 0;
  let currentBlock = "";
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < rawStr.length; i++) {
    const char = rawStr[i];
    if (escapeNext) {
      if (depth > 0) currentBlock += char;
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      if (depth > 0) currentBlock += char;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      if (depth > 0) currentBlock += char;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        if (depth === 0) currentBlock = '{';
        else currentBlock += char;
        depth++;
      } else if (char === '}') {
        depth--;
        currentBlock += char;
        if (depth === 0) {
          try {
            const fixStr = currentBlock.replace(/,\s*([\]}])/g, '$1');
            const obj = JSON.parse(fixStr);
            if (isRenderableBlock(obj)) {
              braceBlocks.push(normalizeBlockText(obj));
            }
          } catch {}
        }
      } else if (depth > 0) {
         currentBlock += char;
      }
    } else {
      if (depth > 0) currentBlock += char;
    }
  }
  return braceBlocks;
};

export const extractJsonMeta = (rawStr: string): any => {
  let cleanJson = rawStr.replace(/```json/gi, '').replace(/```/g, '').trim();
  cleanJson = cleanJson.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  
  try { return JSON.parse(cleanJson); } catch {}

  let depth = 0;
  let currentBlock = "";
  let inString = false;
  let escapeNext = false;
  let longestObject: any = null;
  let longestLength = 0;
  
  for (let i = 0; i < cleanJson.length; i++) {
    const char = cleanJson[i];
    if (escapeNext) {
      if (depth > 0) currentBlock += char;
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      if (depth > 0) currentBlock += char;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      if (depth > 0) currentBlock += char;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        if (depth === 0) currentBlock = '{';
        else currentBlock += char;
        depth++;
      } else if (char === '}') {
        depth--;
        currentBlock += char;
        if (depth === 0) {
          try {
            const fixStr = currentBlock.replace(/,\s*([\]}])/g, '$1');
            const obj = JSON.parse(fixStr);
            if (currentBlock.length > longestLength) {
              longestLength = currentBlock.length;
              longestObject = obj;
            }
          } catch {}
        }
      } else if (depth > 0) {
         currentBlock += char;
      }
    } else {
      if (depth > 0) currentBlock += char;
    }
  }
  
  return longestObject || {};
};

function getLevenshteinDistance(v1: string, v2: string): number {
  if (!v1 || !v2) return Math.max(v1?.length || 0, v2?.length || 0);
  if (v1 === v2) return 0;
  const matrix = [];
  for (let i = 0; i <= v2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= v1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= v2.length; i++) {
    for (let j = 1; j <= v1.length; j++) {
      if (v2.charAt(i - 1) === v1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[v2.length][v1.length];
}

export function runMemoryLinter(
  prevMemory: StoryMemory,
  nextMemory: StoryMemory,
  chapterText: string
): string[] {
  const warnings: string[] = [];
  if (prevMemory.characters) {
    // A deceased character is allowed to be MENTIONED — mourned, discussed, remembered, or
    // have a technique/place named after them. That is natural world-building, not drift.
    // Only flag the genuinely broken case: the dead character appears to actively SPEAK or ACT
    // in the present, with no flashback / vision / spirit framing anywhere in the chapter.
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const ACTIVE_VERB =
      '(?:said|says|asked|asks|replied|replies|answered|shouted|shouts|whispered|whispers|' +
      'growled|roared|snarled|muttered|declared|announced|called|screamed|spoke|speaks|' +
      'nodded|shrugged|smiled|grinned|laughed|frowned|' +
      'walked|walks|stepped|steps|strode|ran|rushed|charged|dashed|leapt|jumped|lunged|' +
      'stood|stands|sat|sits|turned|turns|entered|enters|emerged|appeared|appears|approached|' +
      'drew|draws|raised|lifted|swung|struck|attacked|grabbed|seized|moved)';
    const FLASHBACK_CTX = /(flashback|memory|memories|remember|remembered|recall|recalled|reminisce|vision|dream|spirit|ghost|ghostly|apparition|soul|late\s|grave|tomb|funeral|mourn|eulogy|portrait|statue|shrine|legacy|named after|once said|used to|years ago|long ago|in the past|back then|had died|who died|reincarnat|resurrect|revived)/i;
    const isFlashback = FLASHBACK_CTX.test(chapterText);
    prevMemory.characters.forEach((char) => {
      if (char.status?.toLowerCase() === 'deceased' && char.name) {
        const activeRegex = new RegExp(`\\b${escapeRegExp(char.name)}\\b\\s+${ACTIVE_VERB}\\b`, 'i');
        if (activeRegex.test(chapterText) && !isFlashback) {
          warnings.push(`Deceased character "${char.name}" appears to speak or act in the present. Verify this is a flashback, vision, or resurrection.`);
        }
      }
    });
  }

  if (nextMemory.characters) {
    for (let i = 0; i < nextMemory.characters.length; i++) {
      for (let j = i + 1; j < nextMemory.characters.length; j++) {
        const name1 = nextMemory.characters[i].name;
        const name2 = nextMemory.characters[j].name;
        if (name1 && name2 && name1.toLowerCase() !== name2.toLowerCase()) {
          const parts1 = name1.split(' ');
          const parts2 = name2.split(' ');
          const isSameFamilyName = parts1.length > 1 && parts2.length > 1 && parts1[0].toLowerCase() === parts2[0].toLowerCase();
          
          if (!isSameFamilyName) {
            const distance = getLevenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
            if (distance > 0 && distance <= 2 && name1.length > 5 && name2.length > 5) {
               warnings.push(`Potential duplicate character names: "${name1}" and "${name2}". Check roster.`);
            }
          }
        }
      }
    }
  }

  if (nextMemory.unresolvedPlotThreads && prevMemory.resolvedPlotThreads) {
    for (const thread of nextMemory.unresolvedPlotThreads) {
      const threadStr = typeof thread === 'string' ? thread : thread.description;
      if (prevMemory.resolvedPlotThreads.some(r => {
        const rStr = typeof r === 'string' ? r : r.description;
        return rStr.toLowerCase() === threadStr.toLowerCase();
      })) {
        warnings.push(`Plot thread "${threadStr}" was previously resolved but is now marked unresolved.`);
      }
    }
  }

  return warnings;
}
