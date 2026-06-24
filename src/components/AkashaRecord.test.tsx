import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AkashaRecord from './AkashaRecord';

describe('AkashaRecord', () => {
  it('renders without crashing', () => {
    const { container } = render(<AkashaRecord memory={{ unresolvedPlotThreads: [] } as any} onUpdateMemory={() => {}} />);
    expect(container).toBeDefined();
  });
});
