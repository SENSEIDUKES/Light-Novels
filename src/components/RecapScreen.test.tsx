import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RecapScreen } from './RecapScreen';

describe('RecapScreen', () => {
  it('calls onContinue immediately if no chapters', () => {
    const onContinue = vi.fn();
    const story = { arcs: [] } as any;
    render(<RecapScreen story={story} lastReadChapter={1} onContinue={onContinue} />);
    expect(onContinue).toHaveBeenCalled();
  });

  it('renders correctly if chapters exist', () => {
    const onContinue = vi.fn();
    const story = { 
      arcs: [{ chapters: [{ number: 1, summary: 'Summary' }] }] 
    } as any;
    const { container } = render(<RecapScreen story={story} lastReadChapter={1} onContinue={onContinue} />);
    expect(container).toBeDefined();
    expect(onContinue).not.toHaveBeenCalled();
  });
});
