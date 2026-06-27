import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorldEntityCard } from './WorldEntityCard';
import { WorldCardEvent } from '../types';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  }
}));

describe('WorldEntityCard', () => {
  it('renders correctly', () => {
    const card: WorldCardEvent = {
      entityName: 'Test Beast',
      entityType: 'creature',
      displayTitle: 'Beast Title',
      quote: 'A loud roar.',
      imageUrl: 'http://test',
      audioText: 'Roar',
      audioType: 'roar'
    };

    const { getByText } = render(<WorldEntityCard card={card} />);
    expect(getByText('Beast Title')).toBeDefined();
    expect(getByText('"A loud roar."')).toBeDefined();
    expect(getByText('Tap to Listen')).toBeDefined();
  });
});
