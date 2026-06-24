import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { VoiceEditionPanel } from './VoiceEditionPanel';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    localDeepinfraKey: '',
    localOpenrouterKey: ''
  })
}));

describe('VoiceEditionPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <VoiceEditionPanel 
        selectedChapter={{ audioManifest: null } as any}
        activeStory={{} as any}
        onUpdateStory={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });
});
