import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import CreationPortal from './CreationPortal';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    stories: [],
    createStory: vi.fn(),
    setActiveStory: vi.fn(),
    deleteStory: vi.fn()
  })
}));

describe('CreationPortal', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <CreationPortal 
        onStartStory={vi.fn()}
        onGenerateBlueprint={vi.fn()}
        isGenerating={false}
        error={null}
      />
    );
    expect(container).toBeDefined();
  });
});
