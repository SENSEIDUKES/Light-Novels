import React, { useState } from 'react';
import { Character, StoryMemory } from '../types';
import { resolveKokoroVoicePreset } from '../lib/voice/voiceResolver';

interface UseCodexVoiceCardsOptions {
  memory: StoryMemory;
  onUpdateMemory: (memory: StoryMemory) => void;
}

export function useCodexVoiceCards({ memory, onUpdateMemory }: UseCodexVoiceCardsOptions) {
  const [generatingVoiceId, setGeneratingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePlayVoice = (url: string, charId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onplay = () => setPlayingVoiceId(charId);
    audio.onended = () => setPlayingVoiceId(null);
    audio.onpause = () => setPlayingVoiceId(null);

    audio.play().catch(console.error);
  };

  const handleStopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
    }
  };

  const handleGenerateVoiceCard = async (char: Character) => {
    if (!char.signatureQuote) return;

    setGeneratingVoiceId(char.id);
    try {
      const preset = resolveKokoroVoicePreset({
        mode: 'dialogue',
        language: 'en',
        speakerName: char.name,
        speakerRole: char.role,
        savedVoicePresetId: char.voicePresetId,
      });

      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: char.signatureQuote,
          speakerVoice: preset.providerVoiceId,
        }),
      });

      if (!res.ok) throw new Error('Audio generation failed');
      const data = await res.json();
      const voiceClipUrl = data.audioUrl || `data:audio/mp3;base64,${data.audioBase64}`;

      const updatedChars = memory.characters.map(c => {
        if (c.id === char.id) {
          return {
            ...c,
            voicePresetId: preset.id,
            voiceClipUrl,
          };
        }
        return c;
      });

      onUpdateMemory({ ...memory, characters: updatedChars });
      handlePlayVoice(voiceClipUrl, char.id);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingVoiceId(null);
    }
  };

  return {
    generatingVoiceId,
    playingVoiceId,
    handleGenerateVoiceCard,
    handlePlayVoice,
    handleStopVoice,
  };
}
