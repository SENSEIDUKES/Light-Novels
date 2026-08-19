import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ParticleSystem } from './ParticleSystem';

describe('ParticleSystem', () => {
  it('renders without crashing', () => {
    const { container } = render(<ParticleSystem count={10} />);
    expect(container).toBeDefined();
  });

  it('renders with different particle styles without crashing', () => {
    const { container: containerSword } = render(<ParticleSystem count={10} style="sword_qi" />);
    expect(containerSword).toBeDefined();

    const { container: containerLotus } = render(<ParticleSystem count={10} style="lotus_blossom" />);
    expect(containerLotus).toBeDefined();
  });
});
