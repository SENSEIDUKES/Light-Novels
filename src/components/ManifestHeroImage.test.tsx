import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ManifestHeroImage } from './ManifestHeroImage';
import type { Chapter } from '../types';

vi.mock('motion/react', () => {
  const MotionDiv = ({ children, onViewportEnter, initial: _initial, animate: _animate, transition: _transition, ...props }: any) => {
    useEffect(() => {
      onViewportEnter?.();
    }, [onViewportEnter]);
    return <div {...props}>{children}</div>;
  };

  return { motion: { div: MotionDiv } };
});

const chapter: Chapter = {
  number: 4,
  title: 'The Turning Point',
  premise: 'A decisive battle.',
  status: 'read',
  summary: 'The sect gates open beneath a blood-red moon.',
};

describe('ManifestHeroImage', () => {
  it('renders a manifested hero image and chapter summary', () => {
    render(
      <ManifestHeroImage
        selectedChapter={{
          ...chapter,
          assetManifest: { heroImage: 'https://example.com/chapter-4.png' },
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Chapter Crux Manifestation' })).toHaveProperty(
      'src',
      'https://example.com/chapter-4.png',
    );
    expect(screen.getByText('Memory of this event')).toBeDefined();
    expect(screen.getByText('"The sect gates open beneath a blood-red moon."')).toBeDefined();
    expect(screen.queryByText('Distilling Visual Memory...')).toBeNull();
  });

  it('shows the visual-memory loading state while the hero is generating', () => {
    render(
      <ManifestHeroImage
        selectedChapter={chapter}
        generatingIds={new Set(['chapter-hero-4'])}
      />,
    );

    expect(screen.getByText('Distilling Visual Memory...')).toBeDefined();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('triggers hero generation when the viewport sentinel enters view', () => {
    const triggerHeroGeneration = vi.fn();

    render(
      <ManifestHeroImage
        selectedChapter={chapter}
        triggerHeroGeneration={triggerHeroGeneration}
      />,
    );

    expect(triggerHeroGeneration).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Distilling Visual Memory...')).toBeNull();
  });
});
