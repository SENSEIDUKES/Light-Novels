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
});
