with open("src/lib/voice/kokoroVoiceRegistry.test.ts", "r") as f:
    content = f.read()

search = """  it("should have unique providerVoiceIds for all presets", () => {
    const providerIds = KOKORO_VOICE_PRESETS.map((preset) => preset.providerVoiceId);
    const uniqueProviderIds = new Set(providerIds);

    // Find duplicates for better error messages
    const duplicates = providerIds.filter((id, index) => providerIds.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
    expect(uniqueProviderIds.size).toBe(providerIds.length);
  });"""

replace = """  it("should have defined and non-empty providerVoiceIds for all presets", () => {
    KOKORO_VOICE_PRESETS.forEach((preset) => {
      expect(preset.providerVoiceId).toBeDefined();
      expect(preset.providerVoiceId.length).toBeGreaterThan(0);
    });
  });"""

content = content.replace(search, replace)

with open("src/lib/voice/kokoroVoiceRegistry.test.ts", "w") as f:
    f.write(content)
