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
