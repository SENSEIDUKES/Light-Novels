import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AILoadingVeil } from './AILoadingVeil';

describe('AILoadingVeil', () => {
  it('renders without crashing when generating', () => {
    const { container } = render(<AILoadingVeil isGenerating={true} activeStory={null} />);
    expect(container).toBeDefined();
  });

  it('renders without crashing when not generating', () => {
    const { container } = render(<AILoadingVeil isGenerating={false} activeStory={null} />);
    expect(container).toBeDefined();
  });
});
