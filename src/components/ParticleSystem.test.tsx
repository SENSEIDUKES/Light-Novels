import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ParticleSystem } from './ParticleSystem';

describe('ParticleSystem', () => {
  it('renders without crashing', () => {
    const { container } = render(<ParticleSystem count={10} />);
    expect(container).toBeDefined();
  });

  it('renders with custom particle style motifs without crashing', () => {
    const { container: swordQiContainer } = render(
      <ParticleSystem count={10} particleStyle="sword_qi" />
    );
    expect(swordQiContainer).toBeDefined();

    const { container: lotusContainer } = render(
      <ParticleSystem count={10} particleStyle="lotus_blossom" />
    );
    expect(lotusContainer).toBeDefined();
  });
});
