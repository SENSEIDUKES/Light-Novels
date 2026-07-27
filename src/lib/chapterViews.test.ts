import { describe, it, expect } from 'vitest';
import type { Chapter, GeneratedChapter } from '../types';
import {
  CHAPTER_NON_PERSISTED_KEYS,
  applyStreamingChapter,
  hasReadableProse,
  stripNonPersistedChapterFields,
  toPersistedChapter,
  toReaderChapter,
} from './chapterViews';

const makeGeneratedChapter = (): GeneratedChapter => ({
  number: 4,
  title: 'The Ninth Trial',
  premise: 'Li Wei enters the pagoda.',
  status: 'read',
  summary: 'He survives the ninth floor.',
  sceneFingerprints: [
    { actionType: 'duel', participants: ['Li Wei'], outcome: 'Li Wei wins', chapterNumber: 4 },
  ],
  contractReport: { objectiveFulfilled: true },
  continuityWarnings: ['A name drifted'],
  assetManifest: { heroImage: 'asset-1' },
  generatedContent: 'The pagoda door opened.',
  blocks: [{ type: 'prose', text: 'The pagoda door opened.' } as never],
  statsChangeMessage: '+1 Dao',
  cuePayload: { danger: 3 },
  contextManifest: { version: 1 } as never,
  handoff: { version: 1, chapterNumber: 4, endState: {}, completedEvents: [], fingerprints: [] },
  contract: { version: 1, chapterNumber: 4, objective: 'Survive', doNotRepeat: [] },
  _isNewContent: true,
});

describe('toPersistedChapter', () => {
  it('drops every field that does not survive a Story document write', () => {
    const persisted = toPersistedChapter(makeGeneratedChapter());
    for (const key of CHAPTER_NON_PERSISTED_KEYS) {
      expect(persisted).not.toHaveProperty(key);
    }
  });

  it('keeps the scaffold, including the fields deliberately left on it', () => {
    const persisted = toPersistedChapter(makeGeneratedChapter());
    expect(persisted.number).toBe(4);
    expect(persisted.title).toBe('The Ninth Trial');
    expect(persisted.status).toBe('read');
    // These are compact and power contract building without a content load.
    expect(persisted.summary).toBe('He survives the ninth floor.');
    expect(persisted.sceneFingerprints).toHaveLength(1);
    expect(persisted.contractReport).toEqual({ objectiveFulfilled: true });
    expect(persisted.continuityWarnings).toEqual(['A name drifted']);
    expect(persisted.assetManifest).toEqual({ heroImage: 'asset-1' });
  });

  it('does not mutate its input', () => {
    const chapter = makeGeneratedChapter();
    toPersistedChapter(chapter);
    expect(chapter.generatedContent).toBe('The pagoda door opened.');
    expect(chapter.handoff).toBeDefined();
  });
});

describe('stripNonPersistedChapterFields', () => {
  it('removes the same fields in place', () => {
    const chapter = makeGeneratedChapter();
    stripNonPersistedChapterFields(chapter);
    for (const key of CHAPTER_NON_PERSISTED_KEYS) {
      expect(chapter).not.toHaveProperty(key);
    }
    expect(chapter.summary).toBe('He survives the ninth floor.');
  });

  it('agrees exactly with toPersistedChapter', () => {
    const inPlace = makeGeneratedChapter();
    stripNonPersistedChapterFields(inPlace);
    expect(inPlace).toEqual(toPersistedChapter(makeGeneratedChapter()));
  });
});

describe('toReaderChapter', () => {
  it('drops pipeline internals the reader must not depend on', () => {
    const reader = toReaderChapter(makeGeneratedChapter());
    expect(reader).not.toHaveProperty('handoff');
    expect(reader).not.toHaveProperty('contract');
    expect(reader).not.toHaveProperty('_isNewContent');
  });

  it('keeps the prose and the reader-visible context manifest', () => {
    const reader = toReaderChapter(makeGeneratedChapter());
    expect(reader.generatedContent).toBe('The pagoda door opened.');
    expect(reader.blocks).toHaveLength(1);
    expect(reader.statsChangeMessage).toBe('+1 Dao');
    expect(reader.cuePayload).toEqual({ danger: 3 });
    // The reader's context inspector renders this, and it round-trips.
    expect(reader.contextManifest).toBeDefined();
  });

  it('does not mutate its input', () => {
    const chapter = makeGeneratedChapter();
    toReaderChapter(chapter);
    expect(chapter.handoff).toBeDefined();
  });
});

describe('applyStreamingChapter', () => {
  const base: Chapter = {
    number: 4,
    title: 'The Ninth Trial',
    premise: 'Li Wei enters the pagoda.',
    status: 'generating',
    handoff: { version: 1, chapterNumber: 4, endState: {}, completedEvents: [], fingerprints: [] },
  };

  it('overlays in-flight prose onto the matching chapter', () => {
    const result = applyStreamingChapter(base, {
      number: 4,
      content: 'Half a chapter so far',
      blocks: [{ type: 'prose', text: 'Half a chapter so far' } as never],
    });
    expect(result.generatedContent).toBe('Half a chapter so far');
    expect(result.blocks).toHaveLength(1);
  });

  it('leaves a chapter untouched when the stream is for another chapter', () => {
    const result = applyStreamingChapter(base, { number: 7, content: 'Elsewhere' });
    expect(result.generatedContent).toBeUndefined();
  });

  it('leaves a chapter untouched when nothing is streaming', () => {
    expect(applyStreamingChapter(base, null).generatedContent).toBeUndefined();
    expect(applyStreamingChapter(base, undefined).generatedContent).toBeUndefined();
  });

  it('drops pipeline internals in every branch', () => {
    expect(applyStreamingChapter(base, { number: 4, content: 'x' })).not.toHaveProperty('handoff');
    expect(applyStreamingChapter(base, null)).not.toHaveProperty('handoff');
  });
});

describe('hasReadableProse', () => {
  it('reports on the hydrated copy, not the stored flag', () => {
    // hasContent says prose exists somewhere; it does not say this copy has it.
    expect(hasReadableProse({ generatedContent: undefined, blocks: undefined })).toBe(false);
    expect(hasReadableProse({ generatedContent: 'text', blocks: undefined })).toBe(true);
    expect(hasReadableProse({ generatedContent: undefined, blocks: [{} as never] })).toBe(true);
  });

  it('treats an empty block list as unreadable', () => {
    expect(hasReadableProse({ generatedContent: '', blocks: [] })).toBe(false);
  });

  it('does not treat a malformed non-array blocks value as readable', () => {
    // A legacy record can carry a string here, whose .length would be truthy.
    expect(hasReadableProse({ blocks: 'not blocks' as never })).toBe(false);
    expect(hasReadableProse({ blocks: {} as never })).toBe(false);
  });

  it('tolerates absent input', () => {
    expect(hasReadableProse(null)).toBe(false);
    expect(hasReadableProse(undefined)).toBe(false);
  });
});
