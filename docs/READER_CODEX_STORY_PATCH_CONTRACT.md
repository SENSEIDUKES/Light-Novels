# Reader and Codex story patch contract

## Why this changed

The previous Reader/Codex callback accepted a complete `StoryWorld`. Callers
often created that object with `{ ...story, changes }`. Even though the store
serialized writes and merged a payload into the latest queued story, fields
already present on that stale spread could overwrite a newer queued value.

## New boundary

Reader and Codex now receive:

```ts
updateStoryFields(
  storyId: string,
  updates: ReaderCodexStoryPatch | ((current: StoryWorld) => ReaderCodexStoryPatch),
  options?: StoryUpdateOptions,
): Promise<void>
```

The allowed patch fields are reader preferences, bookmarks, reading position
and stats, reveal backdrops, motion-cover state, relationships, karma nodes,
and Codex-owned memory. It cannot replace `id`, persistence identities,
`arcs`, chapter collections, or story-level media ownership. Functional
patches evaluate only when their save reaches the store queue, so dependent
values use the newest committed story.

## Migrated callers

- `ReaderChamber`: preferences, typography reset, bookmarks, and reading
  anchors now send patches; preference and bookmark edits use functional
  updates when they depend on current values.
- `ReaderScreen`: reading-time accumulation is a functional `readingStats`
  patch.
- `ReaderViewport`: reveal-backdrop assignments use the store's functional
  patch path directly.
- `StoryDetailScreen`: motion-cover toggling is a functional store patch.
- `ReaderCodex`, its context, relationships, deletion hook, and image
  evolution hook now receive the narrow callback and send only their owned
  fields.
- `useCosmicBookmarking` and `useReadingPosition` use the same narrow shape.

## Intentionally separate replacement operations

Story import, conflict resolution, hydration, generation, and dedicated media
ownership operations still use their existing aggregate-specific persistence
paths. They are not Reader/Codex callback operations and were left unchanged.
`onUpdateMemory` remains a memory-only Codex operation; it does not accept or
replace a `StoryWorld`.
