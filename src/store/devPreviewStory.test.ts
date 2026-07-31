import { describe, expect, it } from 'vitest';
import { getDevPreviewStory } from './devPreviewStory';

describe('development preview story', () => {
  it('contains enough real story data to open the Reader Chamber', () => {
    const story = getDevPreviewStory();
    const firstChapter = story.arcs[0].chapters[0];

    expect(story.id).toBe('dev-preview-story');
    expect(story.arcs).toHaveLength(1);
    expect(story.arcs[0].chapters).toHaveLength(2);
    expect(firstChapter.status).toBe('read');
    expect(firstChapter.hasContent).toBe(true);
    expect(firstChapter.generatedContent).toContain('real Reader Chamber is active');
  });

  it('returns an independent copy for each preview mount', () => {
    const first = getDevPreviewStory();
    const second = getDevPreviewStory();

    first.arcs[0].chapters[0].title = 'Changed locally';

    expect(second.arcs[0].chapters[0].title).toBe('A Door Made of Light');
  });
});
