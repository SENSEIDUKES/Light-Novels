import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ContextManifest } from "../types";
import { ContextInspector } from "./ContextInspector";

const manifest = {
  version: 1,
  route: "generate-chapter-stream",
  generatedAt: "2026-07-16T00:00:00.000Z",
  chapterNumber: 12,
  totalEstimatedTokens: 100,
  memoryAndHistoryBudgetTokens: 80000,
  memoryAndHistoryEstimatedTokens: 50,
  memoryAndHistoryBudgetExceeded: false,
  providerInputTruncated: false,
  sections: [],
} as ContextManifest;

describe("ContextInspector", () => {
  it("shows the engine recorded by the manifest", () => {
    render(
      <ContextInspector
        manifest={{ ...manifest, engine: "v2" } as ContextManifest}
      />,
    );

    expect(screen.getByText("Engine v2")).toBeTruthy();
  });

  it("treats legacy manifests without an engine as v1", () => {
    render(<ContextInspector manifest={manifest} />);

    expect(screen.getByText("Engine v1")).toBeTruthy();
  });

  it("shows v2 demotions from the budget ladder", () => {
    render(
      <ContextInspector
        manifest={{
          ...manifest,
          engine: "v2",
          sections: [{
            key: "entityCards",
            label: "Entity cards",
            estimatedTokens: 10,
            includedItemCount: 1,
            availableItemCount: 1,
            includedItems: ["Character: Lin (brief)"],
            demotedItems: ["Character: Lin (full) -> brief"],
            omittedItems: [],
            truncated: true,
            omissionReason: "demoted_to_brief",
          }],
        }}
      />,
    );

    expect(screen.getByText("Demoted:")).toBeTruthy();
    expect(screen.getByText("Character: Lin (full) -> brief")).toBeTruthy();
  });

  it("shows protected context retained beyond the degradable budget", () => {
    render(
      <ContextInspector
        manifest={{
          ...manifest,
          engine: "v2",
          memoryAndHistoryBudgetExceeded: true,
          sections: [{
            key: "anchor",
            label: "Anchor",
            estimatedTokens: 120,
            includedItemCount: 1,
            availableItemCount: 1,
            includedItems: ["Chapter 11 (anchor)"],
            omittedItems: [],
            protectedOverflowTokens: 20,
            truncated: false,
          }],
        }}
      />,
    );

    expect(screen.getByText("Protected overflow:")).toBeTruthy();
    expect(screen.getByText("~20 tokens retained")).toBeTruthy();
  });
});
