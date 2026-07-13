import { describe, expect, it } from "vitest";
import {
  formatHarmonySyncProgress,
  getHarmonySyncProgressPercent,
} from "./syncProgress";

describe("Harmony sync progress", () => {
  it("gives numbered progress while cloud stories are restored", () => {
    expect(
      formatHarmonySyncProgress({
        phase: "downloading",
        completed: 1,
        total: 14,
      }),
    ).toBe("Blowing dust off scrolls 1/14...");
    expect(
      getHarmonySyncProgressPercent({
        phase: "downloading",
        completed: 1,
        total: 14,
      }),
    ).toBe(7);
  });

  it("does not invent a percentage for open-ended setup work", () => {
    const progress = { phase: "initializing", completed: 0, total: 0 } as const;
    expect(formatHarmonySyncProgress(progress)).toBe("Opening the story vault...");
    expect(getHarmonySyncProgressPercent(progress)).toBeNull();
  });
});
