import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ParticleSystem } from './ParticleSystem';

describe('ParticleSystem', () => {
  it('renders without crashing', () => {
    const { container } = render(<ParticleSystem count={10} />);
    expect(container).toBeDefined();
  });

  it('renders each particleStyle successfully', () => {
    const { container, rerender } = render(
      <ParticleSystem count={10} particleStyle="default" />
    );
    expect(container).toBeDefined();

    rerender(<ParticleSystem count={10} particleStyle="sword_qi" />);
    expect(container).toBeDefined();

    rerender(<ParticleSystem count={10} particleStyle="lotus_blossom" />);
    expect(container).toBeDefined();
  });
});
