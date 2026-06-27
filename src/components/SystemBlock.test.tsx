import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SystemBlock, SYSTEM_COLORS_LEGEND } from './SystemBlock';

describe('SystemBlock', () => {
  it('exports SYSTEM_COLORS_LEGEND', () => {
    expect(SYSTEM_COLORS_LEGEND.length).toBeGreaterThan(0);
  });

  it('renders a neutral event without crashing', () => {
    const { container } = render(<SystemBlock system={{ kind: 'status', promptType: 'neutral', title: 'Basic info' }} content="Hello" />);
    expect(container).toBeDefined();
  });
  
  it('renders a danger event without crashing', () => {
    const { container } = render(<SystemBlock system={{ kind: 'status', promptType: 'warning', title: 'Danger Alert' }} content="Danger" />);
    expect(container).toBeDefined();
  });
});
