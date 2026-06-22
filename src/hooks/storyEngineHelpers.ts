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

export const extractJsonBlocks = (rawStr: string): any[] => {
  try {
    const arrayMatch = rawStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
       const parsed = JSON.parse(arrayMatch[0]);
       if (Array.isArray(parsed) && parsed.length > 0 && (typeof parsed[0].text === 'string' || typeof parsed[0].content === 'string')) {
          return parsed.map(b => ({ ...b, text: b.text || b.content }));
       }
    }
  } catch(e) {}

  let blocks: any[] = [];
  const lines = rawStr.split('\n');
  for (let l of lines) {
    const trimmed = l.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        if (obj && (typeof obj.text === 'string' || typeof obj.content === 'string')) {
          blocks.push({ ...obj, text: obj.text || obj.content });
        }
      } catch (e) {}
    }
  }
  if (blocks.length > 0) return blocks;

  let braceBlocks: any[] = [];
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
            let fixStr = currentBlock.replace(/,\s*([\]}])/g, '$1');
            const obj = JSON.parse(fixStr);
            if (obj && (typeof obj.text === 'string' || typeof obj.content === 'string')) {
              braceBlocks.push({ ...obj, text: obj.text || obj.content });
            }
          } catch(e) {}
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
  
  try { return JSON.parse(cleanJson); } catch (e) {}

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
            let fixStr = currentBlock.replace(/,\s*([\]}])/g, '$1');
            const obj = JSON.parse(fixStr);
            if (currentBlock.length > longestLength) {
              longestLength = currentBlock.length;
              longestObject = obj;
            }
          } catch(e) {}
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
    prevMemory.characters.forEach((char) => {
      if (char.status?.toLowerCase() === 'deceased') {
        const regex = new RegExp(`\\b${char.name}\\b`, 'i');
        if (regex.test(chapterText)) {
          warnings.push(`Deceased character "${char.name}" was referenced in the new text. Verify this was a flashback or memory.`);
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
          const distance = getLevenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
          if (distance > 0 && distance <= 2 && name1.length > 4 && name2.length > 4) {
             warnings.push(`Potential duplicate character names: "${name1}" and "${name2}". Check roster.`);
          }
        }
      }
    }
  }

  if (prevMemory.currentPowerStage !== nextMemory.currentPowerStage) {
     const prevStage = prevMemory.currentPowerStage || 'None';
     warnings.push(`Power stage updated from "${prevStage}" to "${nextMemory.currentPowerStage}". Verify no ranks were skipped.`);
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
