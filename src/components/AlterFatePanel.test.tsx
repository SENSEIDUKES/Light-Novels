import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AlterFatePanel } from './AlterFatePanel';

describe('AlterFatePanel', () => {
  it('renders without crashing when open', () => {
    const { container } = render(
      <AlterFatePanel 
        isOpen={true} 
        onClose={vi.fn()} 
        onConfirmFork={vi.fn()} 
        chapterNumber={1} 
      />
    );
    expect(container).toBeDefined();
  });
});
