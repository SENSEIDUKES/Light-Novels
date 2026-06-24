import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CodexSheetOverlay } from './CodexSheetOverlay';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    isCodexSheetOpen: true,
    setIsCodexSheetOpen: vi.fn(),
    stories: [{ id: 'test', memory: { characters: [], relationships: [] }, arcs: [] }],
    activeStoryId: 'test',
    setCurrentScreen: vi.fn(),
    setSelectedChapterNum: vi.fn(),
    routingConfig: {}
  })
}));

describe('CodexSheetOverlay', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <CodexSheetOverlay 
        handleUpdateMemoryManual={vi.fn()} 
        handleUpdateStoryDirect={vi.fn()} 
      />
    );
    expect(container).toBeDefined();
  });
});
