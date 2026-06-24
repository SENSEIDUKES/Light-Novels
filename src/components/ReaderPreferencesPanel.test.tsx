import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReaderPreferencesPanel } from './ReaderPreferencesPanel';

describe('ReaderPreferencesPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ReaderPreferencesPanel 
        currentPrefs={{ fontFamily: 'serif', fontSize: 'lg', lineHeight: 'relaxed', paragraphSpacing: 'normal', themeOverride: 'void' }}
        handleUpdatePreference={vi.fn()}
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
});
