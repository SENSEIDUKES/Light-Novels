import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivingCodexTimeline } from './LivingCodexTimeline';
import { Chapter } from '../../types';

const buildChapter = (overrides: Partial<Chapter> = {}): Chapter => ({
  number: 1,
  title: 'A Very Long Chronicle',
  premise: 'The cultivator follows a compact premise through the ruins.',
  status: 'read',
  hasContent: true,
  summary: 'Short summary.',
  ...overrides,
});

const renderTimeline = (chapter: Chapter, onJumpToChapter = vi.fn()) => render(
  <LivingCodexTimeline
    flatChapters={[
      {
        chapter,
        arcTitle: 'Opening Arc',
        arcIndex: 0,
        isFirstInArc: true,
      },
    ]}
    onJumpToChapter={onJumpToChapter}
  />
);

describe('LivingCodexTimeline', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LivingCodexTimeline 
        flatChapters={[]} 
        onJumpToChapter={vi.fn()} 
      />
    );
    expect(container).toBeDefined();
  });

  it('clamps long summaries to keep timeline rows within the fixed item height', () => {
    const longSummary = Array.from({ length: 24 }, (_, index) => `Long summary sentence ${index + 1}.`).join(' ');

    renderTimeline(buildChapter({ summary: longSummary }));

    const summary = screen.getByText(longSummary);
    expect(summary.className).toContain('line-clamp-3');
    expect(summary.className).toContain('overflow-hidden');
    expect(summary.getAttribute('title')).toBe(longSummary);
  });

  it('clamps long premises and keeps the read/jump button available', () => {
    const longPremise = Array.from({ length: 18 }, (_, index) => `Premise beat ${index + 1}`).join(' — ');
    const onJumpToChapter = vi.fn();

    renderTimeline(buildChapter({ premise: longPremise }), onJumpToChapter);

    const premise = screen.getByText(longPremise);
    expect(premise.className).toContain('line-clamp-2');
    expect(premise.className).toContain('overflow-hidden');
    expect(premise.getAttribute('title')).toBe(longPremise);

    const readButton = screen.getByRole('button', { name: /read scene text for chapter 1/i });
    expect(readButton).toBeDefined();
    expect(readButton.className).toContain('whitespace-nowrap');
  });
});
