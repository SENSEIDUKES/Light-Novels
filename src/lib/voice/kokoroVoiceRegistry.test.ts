import { describe, it, expect } from "vitest";
import { KOKORO_VOICE_PRESETS, KOKORO_VOICE_PRESET_BY_ID } from "./kokoroVoiceRegistry";

describe("Kokoro Voice Registry", () => {
  it("should have at least one preset", () => {
    expect(KOKORO_VOICE_PRESETS.length).toBeGreaterThan(0);
  });

  it("should have unique ids for all presets", () => {
    const ids = KOKORO_VOICE_PRESETS.map((preset) => preset.id);
    const uniqueIds = new Set(ids);

    // If they aren't equal, we can find the duplicates for a better error message
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have a valid providerVoiceId for all presets", () => {
    KOKORO_VOICE_PRESETS.forEach((preset) => {
      expect(preset.providerVoiceId).toBeDefined();
      expect(preset.providerVoiceId.trim()).not.toBe("");
    });
  });

  it("should correctly map presets by id in KOKORO_VOICE_PRESET_BY_ID", () => {
    // Should have same number of keys as presets
    expect(Object.keys(KOKORO_VOICE_PRESET_BY_ID).length).toBe(KOKORO_VOICE_PRESETS.length);

    // Each preset should be correctly mapped
    KOKORO_VOICE_PRESETS.forEach((preset) => {
      expect(KOKORO_VOICE_PRESET_BY_ID[preset.id]).toBe(preset);
    });
  });
});
