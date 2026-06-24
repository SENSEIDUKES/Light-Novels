import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { VirtualizedList } from './VirtualizedList';

describe('VirtualizedList', () => {
  beforeEach(() => {
    window.ResizeObserver = vi.fn().mockImplementation(function() {
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    }) as any;
  });

  it('renders without crashing', () => {
    const { container } = render(
      <VirtualizedList 
        items={[{ id: 1 }]}
        renderItem={(item) => <div>{item.id}</div>}
        itemHeight={50}
        windowHeight={500}
      />
    );
    expect(container).toBeDefined();
  });
});
