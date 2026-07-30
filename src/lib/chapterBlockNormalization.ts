import type { ChapterContent, StoryBlock } from '../types';

const PARAGRAPH_BLOCK_TYPE = 'paragraph';
const DIALOGUE_BLOCK_TYPE = 'dialogue';

type RuntimeBlock = Partial<StoryBlock> & Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function inferredGeneratedBlockType(block: RuntimeBlock, location: string): string {
  const hasProse = hasNonBlankString(block.text);
  const hasSystemEvent = isRecord(block.system);
  const hasWorldCard = isRecord(block.worldCard);

  if (!hasProse && !hasSystemEvent && !hasWorldCard) {
    throw new Error(
      `Chapter ${location} is missing a block type and has no prose, system event, or world card to infer safely.`,
    );
  }

  const metadata = isRecord(block.metadata) ? block.metadata : undefined;
  const explicitMode = hasNonBlankString(metadata?.mode) ? metadata.mode : undefined;
  const isDialogue = explicitMode === DIALOGUE_BLOCK_TYPE
    || (explicitMode === undefined && hasNonBlankString(metadata?.speakerName));
  return isDialogue ? DIALOGUE_BLOCK_TYPE : PARAGRAPH_BLOCK_TYPE;
}

/**
 * Canonicalize a runtime chapter block without changing any authored payload.
 *
 * Generation's established block-type vocabulary is `paragraph` / `dialogue`;
 * structured system events and world cards remain parallel fields on those
 * blocks. Existing nonblank types are deliberately preserved for backwards
 * compatibility with imported and archived chapters.
 */
export function normalizeStoryBlockType<T>(
  value: T,
  location: string,
): T & { type: string } {
  if (!isRecord(value)) {
    throw new Error(`Chapter ${location} cannot be normalized because it is not an object.`);
  }

  const block = value as RuntimeBlock;
  if (hasNonBlankString(block.type)) return value as T & { type: string };
  if (block.type !== undefined && block.type !== null && typeof block.type !== 'string') {
    throw new Error(
      `Chapter ${location} cannot be normalized because its block type must be a string.`,
    );
  }

  return {
    ...value,
    type: inferredGeneratedBlockType(block, location),
  } as T & { type: string };
}

function normalizeBlockCollection(
  value: ChapterContent['blocks'],
  collection: 'blocks' | 'archivedBlocks',
): ChapterContent['blocks'] {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`Chapter ${collection} cannot be normalized because it is not an array.`);
  }
  return value.map((block, index) => normalizeStoryBlockType(block, `${collection}[${index}]`));
}

/**
 * Normalize both active and archived chapter blocks before persistence hashing
 * or Data Connect variable construction.
 */
export function normalizeChapterContentBlockTypes<T extends ChapterContent>(content: T): T {
  const blocks = normalizeBlockCollection(content.blocks, 'blocks');
  const archivedBlocks = normalizeBlockCollection(content.archivedBlocks, 'archivedBlocks');
  if (blocks === content.blocks && archivedBlocks === content.archivedBlocks) return content;
  return {
    ...content,
    blocks,
    archivedBlocks,
  };
}
