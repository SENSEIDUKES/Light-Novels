import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexTimeline } from './LivingCodexTimeline';

describe('LivingCodexTimeline', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LivingCodexTimeline 
        flatChapters={[]} 
        onJumpToChapter={vi.fn()} 
      />
    );
    expect(container).toBeDefined();
  });
});
