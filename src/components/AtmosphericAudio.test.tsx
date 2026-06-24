import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AtmosphericAudio } from './AtmosphericAudio';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => 'reader'
}));

describe('AtmosphericAudio', () => {
  it('renders without crashing', () => {
    const { container } = render(<AtmosphericAudio />);
    expect(container).toBeDefined();
  });
});
