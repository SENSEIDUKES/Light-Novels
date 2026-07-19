import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReaderPreferencesPanel } from './ReaderPreferencesPanel';

describe('ReaderPreferencesPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ReaderPreferencesPanel 
        currentPrefs={{ fontFamily: 'serif', fontSize: 'lg', lineHeight: 'relaxed', paragraphSpacing: 'normal', themeOverride: 'void' }}
        handleUpdatePreference={vi.fn()}
        onResetTypography={vi.fn()}
        isMuted={false}
        handleMuteToggle={vi.fn()}
        atmosphere="none"
        handleAtmosphereChange={vi.fn()}
        volume={0.5}
        handleVolumeChange={vi.fn()}
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
        isMuted={false}
        handleMuteToggle={vi.fn()}
        atmosphere="none"
        handleAtmosphereChange={vi.fn()}
        volume={0.5}
        handleVolumeChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Line height'), { target: { value: '1.7' } });
    fireEvent.click(screen.getByRole('button', { name: 'justify' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(handleUpdatePreference).toHaveBeenCalledWith('lineHeightScale', 1.7);
    expect(handleUpdatePreference).toHaveBeenCalledWith('textAlignment', 'justify');
    expect(onResetTypography).toHaveBeenCalledTimes(1);
  });
});
