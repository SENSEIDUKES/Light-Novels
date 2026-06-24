import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import LivingCodex from './LivingCodex';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    activeStoryId: 'test',
    stories: [{ id: 'test', memory: { characters: [], relationships: [] }, arcs: [] }],
    setCurrentScreen: vi.fn(),
    setSelectedChapterNum: vi.fn()
  })
}));

describe('LivingCodex', () => {
  it('renders without crashing', () => {
    const { container } = render(<LivingCodex isOpen={true} onClose={vi.fn()} />);
    expect(container).toBeDefined();
  });
});
