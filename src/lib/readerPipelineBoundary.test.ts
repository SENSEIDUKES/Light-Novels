import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = path.resolve(process.cwd(), 'src');

const collectSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? collectSourceFiles(entryPath)
      : [entryPath];
  });

const isProductionTypeScript = (filePath: string) =>
  /\.tsx?$/.test(filePath) && !/\.test\.tsx?$/.test(filePath);

const readerComponentFiles = collectSourceFiles(path.join(sourceRoot, 'components'))
  .filter(isProductionTypeScript)
  .filter(filePath => {
    const relativePath = path.relative(path.join(sourceRoot, 'components'), filePath);
    return path.basename(filePath).startsWith('Reader')
      || relativePath.startsWith(`ReaderControls${path.sep}`);
  });

const readerHookPattern = /^use(?:Reader|Reading|CinematicScroll|ChapterTranslation)/;
const readerHookFiles = collectSourceFiles(path.join(sourceRoot, 'hooks'))
  .filter(isProductionTypeScript)
  .filter(filePath => readerHookPattern.test(path.basename(filePath)));

const directChapterPipelineImport =
  /(?:from\s+|import\s*\()\s*['"][^'"]*chapterPipeline(?:\/[^'"]*)?['"]/;

describe('Reader Chamber dependency boundary', () => {
  it('keeps reader components and reader hooks independent of chapterPipeline internals', () => {
    const violations = [...readerComponentFiles, ...readerHookFiles]
      .filter(filePath => directChapterPipelineImport.test(readFileSync(filePath, 'utf8')))
      .map(filePath => path.relative(sourceRoot, filePath).replaceAll(path.sep, '/'));

    expect(violations).toEqual([]);
  });
});

describe('Momentous chapter contract boundary', () => {
  const readerVisualsSource = () =>
    readFileSync(path.join(sourceRoot, 'hooks', 'useReaderVisuals.ts'), 'utf8');

  // Weighting these signals is the domain module's job. If the hook starts
  // reading them again, a generation-side rename can silently change what the
  // Reader shows without any test failing.
  const generationScoringFields: { name: string; pattern: RegExp }[] = [
    { name: 'cuePayload', pattern: /\bcuePayload\b/ },
    { name: 'powerShift', pattern: /\bpowerShift\b/ },
    { name: 'mysticism', pattern: /\bmysticism\b/ },
    { name: 'beastEvent', pattern: /\bbeastEvent\b/ },
    { name: 'promptType', pattern: /\bpromptType\b/ },
    { name: 'block metadata scoring', pattern: /metadata\??\.\s*(danger|intensity|tension)\b/ },
    { name: 'inline momentous event list', pattern: /\bmomentousEvents\b/ },
    { name: 'inline score threshold', pattern: /MIN_SCORE_THRESHOLD/ },
  ];

  it.each(generationScoringFields)(
    'keeps useReaderVisuals from reading $name directly',
    ({ pattern }) => {
      expect(readerVisualsSource()).not.toMatch(pattern);
    },
  );

  it('consumes the momentous decision through the shared contract', () => {
    expect(readerVisualsSource()).toMatch(
      /import\s*\{[^}]*assessMomentousChapter[^}]*\}\s*from\s*['"][^'"]*chapterMomentousness['"]/,
    );
  });

  // The contract is the seam, so it must not reach back into app types,
  // pipeline modules or the store.
  it('keeps the momentousness contract free of any import', () => {
    const contractSource = readFileSync(path.join(sourceRoot, 'lib', 'chapterMomentousness.ts'), 'utf8');
    expect(contractSource).not.toMatch(/^\s*import\s/m);
  });
});
