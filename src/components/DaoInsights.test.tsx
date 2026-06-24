import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DaoInsights } from './DaoInsights';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    stories: [],
    userProfile: { qi: 0 }
  })
}));

describe('DaoInsights', () => {
  it('renders without crashing', () => {
    const { container } = render(<DaoInsights />);
    expect(container).toBeDefined();
  });
});
