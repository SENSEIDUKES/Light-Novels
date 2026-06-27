import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FateResultCard } from './FateResultCard';
import { FateResultData } from '../types';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  }
}));

describe('FateResultCard', () => {
  it('renders FATE AVERTED correctly', () => {
    const data: FateResultData = {
      outcome: 'FATE AVERTED',
      timelineScar: 'Minor scratch',
      permanentCosts: ['Lost arm'],
      newStoryState: 'Safe',
      genreShift: 'Slice of Life',
      newActiveStats: ['HP: 50']
    };

    const { getByText } = render(<FateResultCard data={data} />);
    expect(getByText('FATE RESULT: FATE AVERTED')).toBeDefined();
    expect(getByText('Minor scratch')).toBeDefined();
    expect(getByText('Lost arm')).toBeDefined();
  });

  it('renders DOOM MANIFESTED correctly', () => {
    const data: FateResultData = {
      outcome: 'DOOM MANIFESTED',
      timelineScar: 'World ended',
      permanentCosts: [],
      newStoryState: 'Destroyed',
      genreShift: 'Horror',
      newActiveStats: []
    };

    const { getByText } = render(<FateResultCard data={data} />);
    expect(getByText('FATE RESULT: DOOM MANIFESTED')).toBeDefined();
    expect(getByText('World ended')).toBeDefined();
  });
});
