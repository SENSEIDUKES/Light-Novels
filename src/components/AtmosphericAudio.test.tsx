import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AtmosphericAudio } from './AtmosphericAudio';

const storeState = {
  currentScreen: 'reader',
  immersion: { master: true, audioCues: true, imagePopups: true, sceneMusic: true, autoScroll: true },
};

vi.mock('../store/useAppStore', () => {
  const useAppStore = (selector?: (state: typeof storeState) => unknown) =>
    selector ? selector(storeState) : storeState;
  useAppStore.getState = () => storeState;
  return { useAppStore };
});

describe('AtmosphericAudio', () => {
  it('renders without crashing', () => {
    const { container } = render(<AtmosphericAudio />);
    expect(container).toBeDefined();
  });
});
