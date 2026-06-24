import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GlobalHeader } from './GlobalHeader';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    userProfile: { qi: 0 },
    currentScreen: 'library'
  })
}));

describe('GlobalHeader', () => {
  it('renders without crashing', () => {
    const { container } = render(<GlobalHeader />);
    expect(container).toBeDefined();
  });
});
