import { describe, it, expect } from 'vitest';
import { resolveKokoroVoicePreset } from './voiceResolver';

describe('resolveKokoroVoicePreset', () => {
  // --- Spanish Resolution ---
  it("Spanish narration resolves to em_santa", () => {
    const preset = resolveKokoroVoicePreset({ language: "es", mode: "narration" });
    expect(preset.providerVoiceId).toBe("em_santa");
  });

  it("Spanish female dialogue resolves to ef_dora", () => {
    const preset = resolveKokoroVoicePreset({ language: "es", mode: "dialogue", characterProfile: { gender: "female" } });
    expect(preset.providerVoiceId).toBe("ef_dora");
  });

  it('Spanish young male resolves to em_alex', () => {
    const preset = resolveKokoroVoicePreset({ language: "es", mode: "dialogue", characterProfile: { gender: "male" } });
    expect(preset.providerVoiceId).toBe("em_alex");
  });

  // --- English Role Mappings & Gender Detection ---
  it("Detects female gender via role regex (e.g., sister)", () => {
    const preset = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "younger sister" });
    // Should resolve to en_female_young_friend_1 (af_jessica) as fallback for young female
    expect(preset.providerVoiceId).toBe("af_jessica");
  });

  it("Female young face-slap resolves to af_aoede", () => {
    const preset = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "arrogant heiress" });
    expect(preset.providerVoiceId).toBe("af_aoede");
  });

  it("Female older face-slap resolves to bf_alice", () => {
    const preset = resolveKokoroVoicePreset({
      mode: "dialogue",
      speakerRole: "arrogant matriarch",
      characterProfile: { gender: "female", age: "older" }
    });
    expect(preset.providerVoiceId).toBe("bf_alice");
  });

  it("Male authority roles resolve to am_michael", () => {
    const preset = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "sect leader" });
    expect(preset.providerVoiceId).toBe("am_michael");
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
    const presetOdd = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "face_slap", speakerName: "A" });
    const presetEven = resolveKokoroVoicePreset({ mode: "dialogue", speakerRole: "face_slap", speakerName: "B" });
    expect([presetOdd.providerVoiceId, presetEven.providerVoiceId].sort()).toEqual(["am_adam", "am_echo"].sort());
  });

  // --- Fallbacks ---
  it("Female middle-age fallback resolves to af_kore", () => {
    const preset = resolveKokoroVoicePreset({ mode: "dialogue", characterProfile: { gender: "female", age: "middle" } });
    expect(preset.providerVoiceId).toBe("af_kore");
  });

  it("Male middle-age fallback resolves to bm_daniel", () => {
    const preset = resolveKokoroVoicePreset({ mode: "dialogue", characterProfile: { gender: "male", age: "middle" } });
    expect(preset.providerVoiceId).toBe("bm_daniel");
  });

  it("Female default young fallback resolves to af_jessica", () => {
    const preset = resolveKokoroVoicePreset({ mode: "dialogue", characterProfile: { gender: "female" } });
    expect(preset.providerVoiceId).toBe("af_jessica");
  });

  it("Male default young fallback resolves to am_fenrir", () => {
    const preset = resolveKokoroVoicePreset({ mode: "dialogue", characterProfile: { gender: "male" } });
    expect(preset.providerVoiceId).toBe("am_fenrir");
  });

  it('Narration resolves to bm_lewis preset', () => {
    const preset = resolveKokoroVoicePreset({ mode: "narration" });
    expect(preset.providerVoiceId).toBe("bm_lewis");
  });

  // --- Overrides ---
  it('Saved character voice overrides role mapping', () => {
    const preset = resolveKokoroVoicePreset({
      mode: "dialogue",
      speakerRole: "villain",
      savedVoicePresetId: "en_female_young_expressive_special_1",
    });
    expect(preset.providerVoiceId).toBe("hf_alpha");
  });

  it('Invalid saved voice falls back safely', () => {
    const preset = resolveKokoroVoicePreset({
      mode: "dialogue",
      speakerRole: "villain",
      savedVoicePresetId: "not_a_real_id",
    });
    expect(preset.providerVoiceId).toBe("am_onyx");
  });
});
