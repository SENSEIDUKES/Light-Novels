import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SystemBlock, SYSTEM_COLORS_LEGEND } from './SystemBlock';

describe('SystemBlock', () => {
  it('exports SYSTEM_COLORS_LEGEND', () => {
    expect(SYSTEM_COLORS_LEGEND.length).toBeGreaterThan(0);
  });

  it('renders a neutral event without crashing', () => {
    const { container } = render(<SystemBlock system={{ type: 'neutral' }} content="Hello" />);
    expect(container).toBeDefined();
  });
  
  it('renders a danger event without crashing', () => {
    const { container } = render(<SystemBlock system={{ type: 'fatal_warning' }} content="Danger" />);
    expect(container).toBeDefined();
  });
});
