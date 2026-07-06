import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ReaderControls } from './index';

describe('ReaderControls', () => {
  it('renders without crashing', () => {
    const mockNavigation = {
      selectedChapterNum: 1,
      maxChapterNum: 10,
      navigatePrev: vi.fn(),
      navigateNext: vi.fn(),
      onSwitchTab: vi.fn(),
    };

    const mockPlayback = {
      isPlayingText: false,
      isPausedText: false,
      handleTogglePlayback: vi.fn(),
      readerMode: 'basic-tts',
    };

    const mockAudio = {
      speechRate: 1,
      setSpeechRate: vi.fn(),
      availableVoices: [],
      selectedVoiceURI: '',
      setSelectedVoiceURI: vi.fn(),
      selectedDialogueVoiceURI: '',
      setSelectedDialogueVoiceURI: vi.fn(),
      selectedSideVoiceURI: '',
      setSelectedSideVoiceURI: vi.fn(),
    };

    const mockImmersion = {
      immersion: {},
      setImmersion: vi.fn(),
    };

    const mockActions = {
      handleAlterFate: vi.fn(),
      setIsAlterFateOpen: vi.fn(),
      handleExportText: vi.fn(),
    };

    const mockChapter = {
      content: '',
      title: 'Test Chapter',
      generatedContent: 'Test Generated Content'
    };

    const { container } = render(
      <ReaderControls
        selectedChapter={mockChapter as any}
        navigation={mockNavigation}
        playback={mockPlayback}
        audio={mockAudio}
        immersion={mockImmersion}
        actions={mockActions}
      />
    );

    expect(container).toBeTruthy();
  });
});
