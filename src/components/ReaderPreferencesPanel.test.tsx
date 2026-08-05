import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReaderPreferencesPanel } from './ReaderPreferencesPanel';

describe('ReaderPreferencesPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ReaderPreferencesPanel
        currentPrefs={{ fontFamily: 'serif', fontSize: 'lg', lineHeight: 'relaxed', paragraphSpacing: 'normal', themeOverride: 'void' }}
        handleUpdatePreference={vi.fn()}
        onResetTypography={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });

  it('updates the live typesetting controls and can reset them', () => {
    const handleUpdatePreference = vi.fn();
    const onResetTypography = vi.fn();
    render(
      <ReaderPreferencesPanel
        currentPrefs={{ fontFamily: 'serif', fontSize: 'lg', lineHeight: 'relaxed', paragraphSpacing: 'normal', themeOverride: 'void' }}
        handleUpdatePreference={handleUpdatePreference}
        onResetTypography={onResetTypography}
      />,
    );

    fireEvent.change(screen.getByLabelText('Line height'), { target: { value: '1.7' } });
    fireEvent.click(screen.getByRole('button', { name: 'justify' }));
    fireEvent.click(screen.getByRole('button', { name: /Reset Text/i }));

    expect(handleUpdatePreference).toHaveBeenCalledWith('lineHeightScale', 1.7);
    expect(handleUpdatePreference).toHaveBeenCalledWith('textAlignment', 'justify');
    expect(onResetTypography).toHaveBeenCalledTimes(1);
  });

  it('no longer hosts any audio controls — they live in the immersion Audio menu', () => {
    render(
      <ReaderPreferencesPanel
        currentPrefs={{ fontFamily: 'serif', fontSize: 'lg', lineHeight: 'relaxed', paragraphSpacing: 'normal', themeOverride: 'void' }}
        handleUpdatePreference={vi.fn()}
        onResetTypography={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /Audio & Atmosphere/i })).toBeNull();
    expect(screen.queryByLabelText('Atmosphere volume')).toBeNull();
    expect(screen.queryByLabelText('Scene score track')).toBeNull();
    expect(screen.queryByLabelText('Music volume')).toBeNull();
  });

  it('minimizes and restores each visual preference block independently', async () => {
    render(
      <ReaderPreferencesPanel
        currentPrefs={{ fontFamily: 'serif', fontSize: 'lg', lineHeight: 'relaxed', paragraphSpacing: 'normal', themeOverride: 'void' }}
        handleUpdatePreference={vi.fn()}
        onResetTypography={vi.fn()}
      />,
    );

    const fontToggle = screen.getByRole('button', { name: /Aura Font/i });
    expect(fontToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Rubik (Sans)' })).toBeDefined();

    fireEvent.click(fontToggle);
    expect(fontToggle.getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Rubik (Sans)' })).toBeNull());
    expect(fontToggle.textContent).toContain('Literata (Serif)');

    fireEvent.click(fontToggle);
    expect(fontToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Rubik (Sans)' })).toBeDefined();
  });

  it('allows customizing the chapter divider style and triggers updates', async () => {
    const handleUpdatePreference = vi.fn();
    render(
      <ReaderPreferencesPanel
        currentPrefs={{ fontFamily: 'serif', fontSize: 'lg', lineHeight: 'relaxed', paragraphSpacing: 'normal', themeOverride: 'void', dividerStyle: 'default' }}
        handleUpdatePreference={handleUpdatePreference}
        onResetTypography={vi.fn()}
      />,
    );

    const dividerToggle = screen.getByRole('button', { name: /Chapter Divider/i });
    expect(dividerToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /Celestial Crest/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Celestial Crest/i }));
    expect(handleUpdatePreference).toHaveBeenCalledWith('dividerStyle', 'celestial');
  });

  it('allows customizing the vignette style and triggers updates', async () => {
    const handleUpdatePreference = vi.fn();
    render(
      <ReaderPreferencesPanel
        currentPrefs={{ fontFamily: 'serif', fontSize: 'lg', lineHeight: 'relaxed', paragraphSpacing: 'normal', themeOverride: 'void', vignetteStyle: 'off' }}
        handleUpdatePreference={handleUpdatePreference}
        onResetTypography={vi.fn()}
      />,
    );

    const vignetteToggle = screen.getByRole('button', { name: /Cinematic Vignette/i });
    expect(vignetteToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /Cinematic Shadow/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Cinematic Shadow/i }));
    expect(handleUpdatePreference).toHaveBeenCalledWith('vignetteStyle', 'radial');
  });

  it('allows customizing the particle shape/style and triggers updates', async () => {
    const handleUpdatePreference = vi.fn();
    render(
      <ReaderPreferencesPanel
        currentPrefs={{ fontFamily: 'serif', fontSize: 'lg', lineHeight: 'relaxed', paragraphSpacing: 'normal', themeOverride: 'void', particleStyle: 'default' }}
        handleUpdatePreference={handleUpdatePreference}
        onResetTypography={vi.fn()}
      />,
    );

    const particleStyleToggle = screen.getByRole('button', { name: /Particle Shape/i });
    expect(particleStyleToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /Sword Qi Shards/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Sword Qi Shards/i }));
    expect(handleUpdatePreference).toHaveBeenCalledWith('particleStyle', 'sword_qi');
  });
});
