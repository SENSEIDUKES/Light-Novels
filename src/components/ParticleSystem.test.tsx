import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ParticleSystem } from './ParticleSystem';

describe('ParticleSystem', () => {
  it('renders without crashing with default style', () => {
    const { container } = render(<ParticleSystem count={10} particleStyle="default" />);
    expect(container).toBeDefined();
  });

  it('renders without crashing with sword_qi style', () => {
    const { container } = render(<ParticleSystem count={10} particleStyle="sword_qi" />);
    expect(container).toBeDefined();
  });

  it('renders without crashing with lotus_blossom style', () => {
    const { container } = render(<ParticleSystem count={10} particleStyle="lotus_blossom" />);
    expect(container).toBeDefined();
  });
});
