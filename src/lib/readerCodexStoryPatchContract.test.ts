import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readerCodexSources = [
  'src/components/ReaderChamber.tsx',
  'src/components/ReaderScreen.tsx',
  'src/components/ReaderCodex.tsx',
  'src/components/codex/CodexContext.tsx',
  'src/hooks/useCodexDeletions.ts',
  'src/hooks/useCodexImageEvolution.ts',
  'src/hooks/useCosmicBookmarking.ts',
  'src/hooks/useReadingPosition.ts',
];

describe('Reader/Codex story patch contract', () => {
  it('does not reintroduce a StoryWorld update callback', () => {
    for (const sourcePath of readerCodexSources) {
      const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8');
      expect(source).not.toMatch(/onUpdateStory:\s*\(updatedStory:\s*StoryWorld\)/);
      expect(source).not.toMatch(/handleUpdateStoryDirect/);
    }
  });

  it('uses the narrow shared callback type at every Reader/Codex boundary', () => {
    for (const sourcePath of readerCodexSources) {
      const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8');
      expect(source).toContain('UpdateStoryFields');
    }
  });
});
