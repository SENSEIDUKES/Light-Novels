import { describe, it, expect } from 'vitest';
import { resolveKokoroVoicePreset } from './voiceResolver';

describe('resolveKokoroVoicePreset', () => {
  it('Narration resolves to bm_lewis preset', () => {
    const preset = resolveKokoroVoicePreset({ mode: "narration" });
    expect(preset.providerVoiceId).toBe("bm_lewis");
  });

  it('Villain resolves to am_onyx preset', () => {
    const preset = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "villain" });
    expect(preset.providerVoiceId).toBe("am_onyx");
  });

  it('Main male resolves to am_puck preset', () => {
    const preset = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "main_character", characterProfile: { gender: "male" } });
    expect(preset.providerVoiceId).toBe("am_puck");
  });

  it('Main female/romance resolves to af_heart preset', () => {
    const preset = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "romance", characterProfile: { gender: "female" } });
    expect(preset.providerVoiceId).toBe("af_heart");
  });

  it('Face-slap male rotates between am_adam/am_echo', () => {
    const presetA = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "face_slap", speakerName: "A", characterProfile: { gender: "male" } });
    const presetB = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "face_slap", speakerName: "AB", characterProfile: { gender: "male" } });
    
    // Hash of 'A' is 65 (odd), hash of 'AB' is 65+66=131 (odd).
    // Let's just find two names that have even/odd.
    // sum("A") = 65 (odd)
    // sum("B") = 66 (even)
    const presetOdd = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "face_slap", speakerName: "A" });
    const presetEven = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "face_slap", speakerName: "B" });
    expect([presetOdd.providerVoiceId, presetEven.providerVoiceId].sort()).toEqual(["am_adam", "am_echo"].sort());
  });

  it('Spanish young male resolves to em_alex', () => {
    const preset = resolveKokoroVoicePreset({ language: "es", mode: "dialogue", characterProfile: { gender: "male" } });
    expect(preset.providerVoiceId).toBe("em_alex");
  });

  it('Saved character voice overrides role mapping', () => {
    const preset = resolveKokoroVoicePreset({
      mode: "dialogue",
      speakerRole: "villain",
      savedVoicePresetId: "en_female_young_expressive_special_1",
    });
    // Ordinarily villain would be am_onyx, but we gave it the saved expressive one.
    expect(preset.providerVoiceId).toBe("hf_alpha");
  });

  it('Invalid saved voice falls back safely', () => {
    // Falls back to evaluating parameters if savedVoicePresetId is bad
    const preset = resolveKokoroVoicePreset({
      mode: "dialogue",
      speakerRole: "villain",
      savedVoicePresetId: "not_a_real_id",
    });
    expect(preset.providerVoiceId).toBe("am_onyx");
  });
});
