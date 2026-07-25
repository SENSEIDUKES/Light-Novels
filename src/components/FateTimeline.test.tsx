import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { FateTimeline } from './FateTimeline';
import { useAppStore } from '../store/useAppStore';

const story = {
  id: 'test',
  title: 'Test',
  genre: 'Fantasy',
  mcName: 'Reader',
  customPremise: 'Test premise',
  createdAt: '2026-07-25T00:00:00.000Z',
  updatedAt: '2026-07-25T00:00:00.000Z',
  currentChapterNumber: 2,
  memory: {},
  arcs: [{
    title: 'Arc 1',
    isCompleted: false,
    chapters: [
      { number: 1, title: 'Chapter 1', premise: '', status: 'read', hasContent: true },
      { number: 2, title: 'Chapter 2', premise: '', status: 'read', hasContent: true },
    ],
  }],
} as any;

describe('FateTimeline', () => {
  beforeEach(() => {
    useAppStore.setState({
      stories: [story],
      activeStoryId: 'test',
      currentScreen: 'detail',
      selectedChapterNum: 1,
    });
  });

  it('renders without crashing', () => {
    const { container } = render(
      <FateTimeline 
        isOpen={true}
        onClose={vi.fn()}
        activeStoryId="test"
      />
    );
    expect(container).toBeDefined();
  });

  it('opens the selected timeline chapter instead of replacing it with the resume target', () => {
    const { getByRole } = render(
      <FateTimeline isOpen={true} onClose={vi.fn()} activeStoryId="test" />,
    );

    fireEvent.click(getByRole('button', { name: 'Jump to Chapter 2 of Test' }));

    expect(useAppStore.getState().selectedChapterNum).toBe(2);
    expect(useAppStore.getState().currentScreen).toBe('reader');
  });
});
