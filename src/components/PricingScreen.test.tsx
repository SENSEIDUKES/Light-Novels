import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PricingScreen } from './PricingScreen';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    userProfile: { qi: 0 }
  })
}));

describe('PricingScreen', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <PricingScreen />
    );
    expect(container).toBeDefined();
  });
});
