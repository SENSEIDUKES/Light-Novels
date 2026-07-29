import { beforeEach, describe, it, expect } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import AILoadingVeil from './AILoadingVeil';
import { useAppStore } from '../store/useAppStore';
import { makeActiveRun } from '../test/support/generationRun';

describe('AILoadingVeil', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeGenerationRun: null,
      authSessionGeneration: 0,
      generationProgressMessage: '',
      generatingChapterNum: null,
      isVeilMinimized: false,
      streamingChapter: null,
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
      activeGenerationRun: makeActiveRun({ operation: 'chapter' }),
      generatingChapterNum: 3,
      generationProgressMessage: 'Forging Chapter 3 · 3 of 5',
      isVeilMinimized: false,
    });
    const { getByText, getByRole } = render(<AILoadingVeil />);

    expect(getByText('Chapter 3 Manifestation')).toBeDefined();
    fireEvent.click(getByRole('button', { name: /Minimize to Background/i }));
    expect(useAppStore.getState().isVeilMinimized).toBe(true);
  });

  it('still reports woven passages from the generation slice, not the UI slice', () => {
    // `streamingChapter` moved out of `UISlice` into `GenerationSlice`. The veil
    // selects it from the composed store, so its live progress readout must be
    // unchanged by the ownership move.
    useAppStore.setState({
      activeGenerationRun: makeActiveRun({ operation: 'chapter' }),
      generatingChapterNum: 2,
      isVeilMinimized: false,
      streamingChapter: {
        number: 2,
        content: 'two passages so far',
        blocks: [
          { type: 'prose', text: 'one' },
          { type: 'prose', text: 'two' },
        ] as never,
      },
    });
    const { getByText } = render(<AILoadingVeil />);

    expect(getByText('2 passages formed')).toBeDefined();
  });

  it('falls back to the idle channel copy once the stream is cleared', () => {
    useAppStore.setState({
      activeGenerationRun: makeActiveRun({ operation: 'chapter' }),
      generatingChapterNum: 2,
      isVeilMinimized: false,
      streamingChapter: null,
    });
    const { getByText } = render(<AILoadingVeil />);

    expect(getByText('Initiating Cosmic Channel')).toBeDefined();
  });

  it('describes whether the compact details toggle will show or hide details', () => {
    useAppStore.setState({
      activeGenerationRun: makeActiveRun({ operation: 'chapter' }),
      isVeilMinimized: true,
    });
    const { getByRole } = render(<AILoadingVeil />);

    const toggle = getByRole('button', { name: 'Show generation details' });
    fireEvent.click(toggle);

    expect(
      getByRole('button', { name: 'Hide generation details' }),
    ).toBeDefined();
  });
});
