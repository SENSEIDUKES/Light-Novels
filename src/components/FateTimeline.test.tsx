import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FateTimeline } from './FateTimeline';

describe('FateTimeline', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <FateTimeline 
        story={{ id: 'test', arcs: [], memory: { unresolvedPlotThreads: [] } } as any}
        onSelectChapter={vi.fn()}
        selectedChapterNum={1}
      />
    );
    expect(container).toBeDefined();
  });
});
