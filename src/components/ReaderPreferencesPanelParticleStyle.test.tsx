import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReaderPreferencesPanel } from './ReaderPreferencesPanel';
import { ReaderPreferences } from '../types';

describe('ReaderPreferencesPanel Particle Customization', () => {
  const defaultPrefs: ReaderPreferences = {
    fontSize: 'base',
    fontFamily: 'serif',
    lineHeight: 'normal',
    paragraphSpacing: 'normal',
    particleIntensity: 'default',
    particleStyle: 'default',
  };

  it('renders particle style options when expanding Atmospheric Particles group', async () => {
    const handleUpdatePreference = vi.fn();
    const onResetTypography = vi.fn();

    render(
      <ReaderPreferencesPanel
        currentPrefs={defaultPrefs}
        handleUpdatePreference={handleUpdatePreference}
        onResetTypography={onResetTypography}
      />
    );

    // Find the toggle button for Atmospheric Particles
    const groupButton = screen.getByRole('button', { name: /Atmospheric Particles/i });

    // Ensure we can click the group button to ensure it is open
    fireEvent.click(groupButton);

    // Look for Flow Intensity subheading and Aura Particle Shape subheading
    expect(screen.getByText('Flow Intensity')).toBeDefined();
    expect(screen.getByText('Aura Particle Shape')).toBeDefined();

    // Check that style options exist by searching all buttons with matching text
    const orbsBtn = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Aetherial Orbs'));
    const shardsBtn = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Sword Qi Shards'));
    const petalsBtn = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Lotus Petals'));

    expect(orbsBtn).toBeDefined();
    expect(shardsBtn).toBeDefined();
    expect(petalsBtn).toBeDefined();

    // Select the "Sword Qi Shards" option
    fireEvent.click(shardsBtn!);
    expect(handleUpdatePreference).toHaveBeenCalledWith('particleStyle', 'sword_qi');
  });
});
