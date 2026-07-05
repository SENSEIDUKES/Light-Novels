import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCodexCharacterEditing } from './useCodexCharacterEditing';
import { useCodexLocations } from './useCodexLocations';
import { useCodexVoiceCards } from './useCodexVoiceCards';
import { Character, StoryMemory } from '../types';

const baseCharacter: Character = {
  id: 'char-1',
  name: 'Lin Mei',
  role: 'Sword cultivator',
  description: 'A focused disciple.',
  relationshipToMC: 'Ally',
  status: 'alive',
  powerLevel: 'Qi Condensation',
  faction: 'Azure Sect',
  signatureQuote: 'The blade remembers.',
};

const makeMemory = (overrides: Partial<StoryMemory> = {}): StoryMemory => ({
  powerSystem: 'Cultivation',
  currentPowerStage: 'Mortal',
  worldRules: [],
  characters: [baseCharacter],
  unresolvedPlotThreads: [],
  resolvedPlotThreads: [],
  ...overrides,
});

describe('codex character behavior hooks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves memory unchanged and clears loading when voice generation fails', async () => {
    const onUpdateMemory = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useCodexVoiceCards({ memory: makeMemory(), onUpdateMemory }));

    await act(async () => {
      await result.current.handleGenerateVoiceCard(baseCharacter);
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/generate-audio', expect.objectContaining({ method: 'POST' }));
    expect(onUpdateMemory).not.toHaveBeenCalled();
    expect(result.current.generatingVoiceId).toBeNull();
    expect(consoleError).toHaveBeenCalled();
  });


  it('clears old audio handlers before pausing when switching voice playback', () => {
    const createdAudio: Array<HTMLAudioElement & { pause: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn> }> = [];
    class MockAudio {
      onplay: (() => void) | null = null;
      onended: (() => void) | null = null;
      onpause: (() => void) | null = null;
      pause = vi.fn();
      play = vi.fn().mockResolvedValue(undefined);

      constructor(public src: string) {
        createdAudio.push(this as unknown as HTMLAudioElement & { pause: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn> });
      }
    }
    vi.stubGlobal('Audio', MockAudio);
    const { result } = renderHook(() => useCodexVoiceCards({ memory: makeMemory(), onUpdateMemory: vi.fn() }));

    act(() => {
      result.current.handlePlayVoice('first.mp3', 'char-1');
    });
    const firstAudio = createdAudio[0];
    expect(firstAudio.onpause).toEqual(expect.any(Function));

    act(() => {
      result.current.handlePlayVoice('second.mp3', 'char-2');
    });

    expect(firstAudio.onplay).toBeNull();
    expect(firstAudio.onended).toBeNull();
    expect(firstAudio.onpause).toBeNull();
    expect(firstAudio.pause).toHaveBeenCalled();
    expect(createdAudio[1].src).toBe('second.mp3');
  });

  it('saves edited character fields back into memory', () => {
    const onUpdateMemory = vi.fn();
    const { result } = renderHook(() => useCodexCharacterEditing({ memory: makeMemory(), onUpdateMemory }));

    act(() => {
      result.current.beginCharEdit(baseCharacter);
    });
    act(() => {
      result.current.setEditingCharData({
        powerLevel: ' Golden Core ',
        faction: ' Wandering Peak ',
        signatureQuote: ' Cut through fate. ',
        abilitiesInput: 'Sky Step,  Moon Slash ',
        status: 'ascended',
      });
    });
    act(() => {
      result.current.handleSaveCharEdit();
    });

    expect(onUpdateMemory).toHaveBeenCalledWith(expect.objectContaining({
      characters: [expect.objectContaining({
        id: 'char-1',
        powerLevel: 'Golden Core',
        faction: 'Wandering Peak',
        signatureQuote: 'Cut through fate.',
        abilities: ['Sky Step', 'Moon Slash'],
        status: 'ascended',
      })],
    }));
    expect(result.current.editingCharId).toBeNull();
  });

  it('adds a trimmed location and closes the add form', () => {
    const onUpdateMemory = vi.fn();
    vi.spyOn(Date, 'now').mockReturnValue(12345);
    const { result } = renderHook(() => useCodexLocations({ memory: makeMemory({ locations: [] }), onUpdateMemory }));

    act(() => {
      result.current.setShowAddLocationForm(true);
      result.current.setNewLocation({
        name: ' Primordial Fog Valley ',
        description: ' Floating islands ',
        realm: ' Heavenly Realm ',
        safetyLevel: 'Dangerous',
      });
    });
    act(() => {
      result.current.handleAddLocation({ preventDefault: vi.fn() } as any);
    });

    expect(onUpdateMemory).toHaveBeenCalledWith(expect.objectContaining({
      locations: [{
        id: 'loc-12345',
        name: 'Primordial Fog Valley',
        description: 'Floating islands',
        realm: 'Heavenly Realm',
        safetyLevel: 'Dangerous',
      }],
    }));
    expect(result.current.newLocation).toEqual({ name: '', description: '', realm: '', safetyLevel: 'Safe' });
    expect(result.current.showAddLocationForm).toBe(false);
  });
});
