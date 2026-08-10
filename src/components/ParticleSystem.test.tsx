import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ParticleSystem } from './ParticleSystem';

describe('ParticleSystem', () => {
  it('renders without crashing', () => {
    const { container } = render(<ParticleSystem count={10} />);
    expect(container).toBeDefined();
  });

  it('renders with sword_qi style preference without crashing', () => {
    const { container } = render(<ParticleSystem count={10} stylePreference="sword_qi" />);
    expect(container).toBeDefined();
  });

  it('renders with lotus_blossom style preference without crashing', () => {
    const { container } = render(<ParticleSystem count={10} stylePreference="lotus_blossom" />);
    expect(container).toBeDefined();
  });
});
