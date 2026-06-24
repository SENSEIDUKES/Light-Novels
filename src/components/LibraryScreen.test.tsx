import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LibraryScreen } from './LibraryScreen';
import { GlobalHeader } from './GlobalHeader';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    currentScreen: 'library',
    setCurrentScreen: vi.fn(),
    stories: [],
    setActiveStoryId: vi.fn(),
    setStoryToDelete: vi.fn(),
    userProfile: { qi: 0 }
  })
}));

describe('LibraryScreen', () => {
  it('renders without crashing', () => {
    const { container } = render(<LibraryScreen />);
    expect(container).toBeDefined();
  });
});

describe('GlobalHeader', () => {
  it('renders without crashing', () => {
    const { container } = render(<GlobalHeader />);
    expect(container).toBeDefined();
  });
});
