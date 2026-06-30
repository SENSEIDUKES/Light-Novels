import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GlobalHeader } from './GlobalHeader';

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: any) => selector({
    userProfile: { qi: 0 },
    currentScreen: 'library',
    stories: [],
    activeStoryId: ''
  })
}));

describe('GlobalHeader', () => {
  it('renders without crashing', () => {
    const { container } = render(<GlobalHeader />);
    expect(container).toBeDefined();
  });
});
