import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocationCard } from './LocationCard';
import type { Location, Story } from '../../../types';

const handleDownload = vi.hoisted(() => vi.fn());

vi.mock('../LivingCodexImageGallery', () => ({
  LivingCodexImageGallery: () => null,
}));

vi.mock('../../../utils/downloadUtils', () => ({
  handleDownload,
}));

const location: Location = {
  id: 'jade-bridge',
  name: 'Jade Bridge',
  description: 'A bridge suspended above a sea of clouds.',
  realm: 'Mortal Realm',
  safetyLevel: 'Safe',
  imageUrl: 'https://example.com/jade-bridge.png',
  firstAppeared: 3,
};

const activeStory = {
  imageHistory: [],
} as Story;

function renderCard(overrides: Partial<React.ComponentProps<typeof LocationCard>> = {}) {
  return render(
    <LocationCard
      loc={location}
      activePreview={null}
      activeStory={activeStory}
      hasAppeared={true}
      canGenerate={true}
      isGenerating={false}
      isFreeUserOnHubStory={false}
      handleAwakenCardImage={vi.fn()}
      setSelectedNodeChar={vi.fn()}
      {...overrides}
    />,
  );
}

describe('LocationCard', () => {
  it('renders location details, image status, and discovery metadata', () => {
    renderCard();

    expect(screen.getByRole('img', { name: 'Jade Bridge' })).toHaveProperty(
      'src',
      'https://example.com/jade-bridge.png',
    );
    expect(screen.getByText('Jade Bridge')).toBeDefined();
    expect(screen.getByText('"A bridge suspended above a sea of clouds."')).toBeDefined();
    expect(screen.getByText('Mortal Realm')).toBeDefined();
    expect(screen.getByText('Safe')).toBeDefined();
    expect(screen.getByText('Unlocked')).toBeDefined();
    expect(screen.getByText('Known since Ch.3')).toBeDefined();
  });

  it('downloads the displayed scenery and exposes the context action', () => {
    const setSelectedNodeChar = vi.fn();
    renderCard({ setSelectedNodeChar });

    fireEvent.click(screen.getByTitle('Download Scenery Vista'));
    expect(handleDownload).toHaveBeenCalledWith(
      'https://example.com/jade-bridge.png',
      'jade_bridge_landscape.png',
    );

    fireEvent.click(screen.getByTitle('View Context Matrix'));
    expect(setSelectedNodeChar).toHaveBeenCalledWith(location);
  });

  it('shows a locked empty state before the location appears in the story', () => {
    renderCard({
      loc: { ...location, imageUrl: undefined, safetyLevel: 'Lethal' },
      hasAppeared: false,
      canGenerate: false,
    });

    expect(screen.getByText('LANDSCAPE GEOLOCK EMPTY')).toBeDefined();
    expect(screen.getByText('Lethal')).toBeDefined();
    expect(screen.getByText('Locked')).toBeDefined();
    expect(screen.getByTitle('Requires further reading to manifest')).toBeDefined();
  });
});
