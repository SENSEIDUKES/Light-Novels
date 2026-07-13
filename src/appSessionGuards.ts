import type { AppState } from './store/useAppStore';

export type StoryRefreshGuardState = Pick<
  AppState,
  'stories' | 'activeStoryId' | 'selectedChapterNum'
>;

export function isStoryRefreshStillCurrent(
  captured: StoryRefreshGuardState,
  current: StoryRefreshGuardState,
): boolean {
  return captured.stories === current.stories
    && captured.activeStoryId === current.activeStoryId
    && captured.selectedChapterNum === current.selectedChapterNum;
}

export function isProfileSnapshotStillCurrent({
  expectedUid,
  expectedVersion,
  currentVersion,
  authenticatedUid,
  renderedUid,
}: {
  expectedUid: string;
  expectedVersion: number;
  currentVersion: number;
  authenticatedUid: string | null;
  renderedUid: string | null;
}): boolean {
  return expectedVersion === currentVersion
    && authenticatedUid === expectedUid
    && renderedUid === expectedUid;
}
