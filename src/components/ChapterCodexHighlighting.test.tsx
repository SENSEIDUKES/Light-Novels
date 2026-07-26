import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import type { StoryMemory } from '../types';
import { collectCodexTerms, createCodexHighlighter, splitByCodexTerms } from '../lib/codexHighlighting';
import { CodexHovercard } from './CodexHovercard';

const storyState = vi.hoisted(() => ({
  current: { id: 'story-1', mcName: 'Li Qiye', readerPreferences: {} as Record<string, unknown> },
}));

vi.mock('../hooks/useImageManifest', () => ({
  useImageManifest: () => ({ manifestImage: vi.fn(), generatingIds: new Set() }),
}));

vi.mock('../store/useAppStore', () => {
  const useAppStore = Object.assign(
    (selector?: (state: any) => unknown) => {
      const state = { activeStoryId: 'story-1', stories: [storyState.current], setAppError: vi.fn() };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ setAppError: vi.fn() }) },
  );
  return { useAppStore };
});

const memory = {
  powerSystem: 'Qi',
  currentPowerStage: 'Foundation',
  worldRules: [],
  characters: [
    { id: 'c1', name: 'Li Qiye', description: '', relationshipToMC: 'Self' },
    { id: 'c2', name: 'Ye Mo (Reborn)', description: '', relationshipToMC: 'Rival', aliases: ['Young Master Ye'] },
  ],
  locations: [{ id: 'l1', name: 'Sky Altar', description: 'A sacred terrace.' }],
  artifacts: [{ id: 'a1', name: 'Jade Blade', description: '', tier: 'Legendary' }],
  factions: [{ id: 'f1', name: 'Azure Sect', description: '' }],
  abilities: [],
  unresolvedPlotThreads: [],
  resolvedPlotThreads: [],
  memoryWarnings: [],
} as unknown as StoryMemory;

/** The reader's paragraph renderer, minus its TTS branch. */
function Paragraph({ text }: { text: string }) {
  const highlighter = createCodexHighlighter(collectCodexTerms(memory));
  return (
    <p>
      {splitByCodexTerms(text, highlighter).map((segment, index) => (
        segment.match
          ? (
            <CodexHovercard
              key={index}
              term={segment.text}
              type={segment.match.type}
              entry={segment.match.entry}
            >
              {segment.text}
            </CodexHovercard>
          )
          : <React.Fragment key={index}>{segment.text}</React.Fragment>
      ))}
    </p>
  );
}

function colourOf(container: HTMLElement, text: string): string {
  const span = Array.from(container.querySelectorAll('span[role="button"]'))
    .find(node => node.textContent === text);
  if (!span) throw new Error(`"${text}" was not highlighted at all.`);
  return span.className;
}

describe('chapter entity highlighting', () => {
  // A single entity with parentheses in its name used to corrupt the compiled
  // alternation, so every name in the paragraph lost its colour. This walks the
  // real chain: hydrated Codex memory -> terms -> matcher -> rendered colours.
  it('colours each mention by its own Codex category', () => {
    const { container } = render(
      <Paragraph text={
        'Li Qiye faced Ye Mo (Reborn) on the Sky Altar while the Azure Sect watched, and the Jade Blade sang.'
      } />
    );

    expect(colourOf(container, 'Li Qiye')).toContain('text-portal');
    expect(colourOf(container, 'Ye Mo (Reborn)')).toContain('text-red-500');
    expect(colourOf(container, 'Sky Altar')).toContain('text-[#d4af37]');
    expect(colourOf(container, 'Azure Sect')).toContain('text-[#b9d6c1]');
    expect(colourOf(container, 'Jade Blade')).toContain('text-[#d4af37]');
    expect(container.textContent).toBe(
      'Li Qiye faced Ye Mo (Reborn) on the Sky Altar while the Azure Sect watched, and the Jade Blade sang.'
    );
  });

  it('colours an alias with its entity colour', () => {
    const { container } = render(<Paragraph text="Young Master Ye arrived last." />);
    expect(colourOf(container, 'Young Master Ye')).toContain('text-red-500');
  });

  it('leaves prose without Codex mentions untouched', () => {
    const { container } = render(<Paragraph text="Rain fell across the empty courtyard." />);
    expect(container.querySelectorAll('span[role="button"]')).toHaveLength(0);
    expect(container.textContent).toBe('Rain fell across the empty courtyard.');
  });
});
