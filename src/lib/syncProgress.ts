import type { SyncProgress } from "./storage";

export function formatHarmonySyncProgress(progress: SyncProgress): string {
  const count = progress.total > 0 ? ` ${progress.completed}/${progress.total}` : "";

  switch (progress.phase) {
    case "cataloguing":
      return `Cataloguing your scrolls${count}...`;
    case "downloading":
      return `Blowing dust off scrolls${count}...`;
    case "harmonizing-stories":
      return `Harmonizing scrolls${count}...`;
    case "harmonizing-chapters":
      return `Restoring chapter seals${count}...`;
    case "sealing":
      return `Sealing recent changes${count}...`;
    case "complete":
      return "Harmony is complete.";
    case "error":
      return "Harmony needs another moment...";
    case "initializing":
    default:
      return "Opening the story vault...";
  }
}

export function getHarmonySyncProgressPercent(progress: SyncProgress): number | null {
  if (progress.total <= 0) return null;
  return Math.round(Math.min(100, Math.max(0, (progress.completed / progress.total) * 100)));
}
