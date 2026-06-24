import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FateTimeline } from './FateTimeline';

describe('FateTimeline', () => {
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
});
