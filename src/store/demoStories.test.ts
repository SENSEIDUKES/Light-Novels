import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_DEMO_STORIES, getRandomDemoStory } from './demoStories';

describe('demoStories', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export INITIAL_DEMO_STORIES array', () => {
    expect(Array.isArray(INITIAL_DEMO_STORIES)).toBe(true);
    expect(INITIAL_DEMO_STORIES.length).toBeGreaterThan(0);
  });

  it('getRandomDemoStory should return a unique story each time', () => {
    const story1 = getRandomDemoStory();
    const story2 = getRandomDemoStory();
    expect(story1.id).not.toBe(story2.id);
    expect(story1.title).toBeDefined();
    expect(story2.title).toBeDefined();
  });

  it('returns a deep clone of the selected template', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const template = INITIAL_DEMO_STORIES[0];
    const originalTitle = template.arcs[0].chapters[0].title;

    const story = getRandomDemoStory();
    story.arcs[0].chapters[0].title = 'Mutated chapter';

    expect(template.arcs[0].chapters[0].title).toBe(originalTitle);
  });
});
