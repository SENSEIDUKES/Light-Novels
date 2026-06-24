import { describe, it, expect } from 'vitest';
import { INITIAL_DEMO_STORIES, getRandomDemoStory } from './demoStories';

describe('demoStories', () => {
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
});
