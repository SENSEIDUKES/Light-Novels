import { beforeEach, describe, it, expect } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import AILoadingVeil from './AILoadingVeil';
import { useAppStore } from '../store/useAppStore';

describe('AILoadingVeil', () => {
  beforeEach(() => {
    useAppStore.setState({
      isGenerating: false,
      generationPhase: null,
      generationProgressMessage: '',
      generatingChapterNum: null,
      isVeilMinimized: false,
    });
  });

  it('renders without crashing when generating', () => {
    const { container } = render(<AILoadingVeil />);
    expect(container).toBeDefined();
  });

  it('renders without crashing when not generating', () => {
    const { container } = render(<AILoadingVeil />);
    expect(container).toBeDefined();
  });

  it('keeps the full-screen veil and its existing minimize control for chapter generation', () => {
    useAppStore.setState({
      isGenerating: true,
      generationPhase: 'chapter',
      generatingChapterNum: 3,
      generationProgressMessage: 'Forging Chapter 3 · 3 of 5',
      isVeilMinimized: false,
    });
    const { getByText } = render(<AILoadingVeil />);

    expect(getByText('Chapter 3 Manifestation')).toBeDefined();
    fireEvent.click(getByText('Minimize to Background'));
    expect(useAppStore.getState().isVeilMinimized).toBe(true);
  });
});
