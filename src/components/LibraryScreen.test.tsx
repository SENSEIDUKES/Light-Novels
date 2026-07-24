import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LibraryScreen } from './LibraryScreen';
import { GlobalHeader } from './GlobalHeader';

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: any) => selector({
    currentScreen: 'home',
    setCurrentScreen: vi.fn(),
    stories: [],
    setActiveStoryId: vi.fn(),
    setStoryToDelete: vi.fn(),
    userProfile: { qi: 0 },
    syncStatus: 'synced',
  })
}));

describe('LibraryScreen', () => {
  it('renders without crashing', () => {
    const { container } = render(<LibraryScreen />);
    expect(container).toBeDefined();
  });

  it('does not ship obsolete default worlds as selectable library entries', () => {
    render(<LibraryScreen />);

    expect(screen.queryByRole('button', {
      name: 'View published world Immortal Calamity: Echoes of the Cauldron',
    })).toBeNull();
    expect(screen.getByText(
      'Curated worlds will return after their chapters are published to the current library format.',
    )).toBeDefined();
  });
});

describe('GlobalHeader', () => {
  it('renders without crashing', () => {
    const { container } = render(<GlobalHeader />);
    expect(container).toBeDefined();
  });
});
