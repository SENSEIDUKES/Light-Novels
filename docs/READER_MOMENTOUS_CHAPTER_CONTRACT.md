# Momentous chapter contract

## Why this changed

`useReaderVisuals` decided which chapters deserve momentous visual treatment by
reaching straight into generation-output internals: `cuePayload.powerShift`,
`cuePayload.danger`, `cuePayload.mysticism`, `cuePayload.beastEvent.type`, block
`system.promptType`, and block `metadata.danger` / `.intensity` / `.tension`. The
weights, the event list and the threshold were literals inside a `useMemo`.

Nothing typed that boundary. A field rename, a schema change or a weighting tweak
on the generation side changed what the Reader displayed with no compile error
and no focused test.

`src/lib/chapterMomentousness.ts` now owns that decision behind one structural,
pipeline-agnostic contract. The module imports nothing — an architecture test
enforces this — so it cannot drift back toward generation internals.

## Dependency direction

Before: `useReaderVisuals` → generation payload internals (untyped, unpinned).

After: `useReaderVisuals` → `assessMomentousChapter` → `MomentousChapterSignals`.
The hook coordinates visuals and effects and reads no scoring field. The single
adapter `toMomentousChapterSignals` is the one place that knows a persisted
chapter calls its cue `cuePayload`.

## Scoring table

Every chapter of the selected chapter's arc is scored, so the decision is
comparative rather than absolute.

| Signal | Source | Weight | Contribution |
| --- | --- | --- | --- |
| Arc finale | last chapter of an arc with ≥ 4 chapters | 15 | flat |
| Power shift | `chapterCue.powerShift` | 2 | `value × 2` |
| Danger | `chapterCue.danger` | 1.5 | `value × 1.5` |
| Mysticism | `chapterCue.mysticism` | 1 | `value × 1` |
| Beast event | `chapterCue.beastEvent.type` in the momentous list | 10 | flat |
| Block system prompt | block `system.promptType` in the momentous list | 8 | flat, per block |
| Block danger | block `metadata.danger` | 1 | `value × 1`, per block |
| Block intensity | block `metadata.intensity` | 1 | `value × 1`, per block |
| Block tension | block `metadata.tension` | 1 | `value × 1`, per block |

Momentous event list, matched against both `beastEvent.type` and
`system.promptType`: `breakthrough`, `turning-point`, `evolution`, `betrayal`,
`ascension`, `conquest`, `destruction`, `calamity`, `rival_battle`, `romance`,
`first_kiss`.

### Threshold and selection

- `MOMENTOUS_SCORE_THRESHOLD = 15` — a chapter must score **at or above** 15.
- Eligible chapters are ranked highest score first; ties keep arc order.
- `MAX_MOMENTOUS_CHAPTERS_PER_ARC = 3` — only the top three become peaks.

A chapter above the threshold is therefore still not momentous if three siblings
in its arc outrank it.

### Falsy signals are absent, not zero

A `0`, `null`, `undefined` or `NaN` signal contributes nothing and produces no
reason. This is the original `if (cue?.powerShift)` guard, kept deliberately:
`powerShift: 0` and an absent `powerShift` are indistinguishable to the scorer.

## Stable reader-facing signals

These are the whole input contract. Anything the Reader wants to influence
momentousness must enter through them:

- `chapterCue.powerShift`, `.danger`, `.mysticism`, `.beastEvent.type`
- block `system.promptType`
- block `metadata.danger`, `.intensity`, `.tension`
- arc position and arc length, supplied by the arc pass rather than read off a
  chapter

## Intentionally ignored generation details

The contract deliberately accepts none of the following, even though they sit on
the same payloads: `sceneType`, `environment`, `atmosphereCategory`,
`atmosphereTags`, `theme`, `emotion`, `element`, `signature`, `music`,
`relationshipShift`, `cuePayload.intensity`, `cuePayload.tension`,
`beastEvent.profile`, block `text`, block `type`, block `worldCard`,
`system.kind`, `system.rarity`, handoffs, contracts, context manifests and
translations.

It is also independent of the live generation-status cluster — `isGenerating`,
`generationPhase`, `generationProgressMessage`, `estimatedSecondsRemaining`,
`generatingChapterNum`, `activeAgentId` — and of `streamingChapter`. Scoring reads
only persisted arc content, so the `GenerationSlice` ownership question from
PR #233 does not touch it.

Note that `cuePayload.intensity` and `cuePayload.tension` exist and are *not*
scored, while the identically named block metadata fields *are*. That asymmetry
is inherited behaviour, not a design decision.

## Known asymmetry in the event list

One list is matched against two producers whose own unions only partially
overlap it:

- Of the declared `SystemEvent.promptType` union, only `breakthrough` and
  `romance` are momentous. `turning-point`, `evolution`, `betrayal`, `ascension`,
  `conquest`, `destruction`, `calamity`, `rival_battle` and `first_kiss` are not
  values a generated block's `promptType` can hold.
- Of the declared `beastEvent.type` union, only `turning-point` and
  `breakthrough` are momentous.

This is preserved as-is and pinned by tests over the full declared unions, so
widening the overlap has to be a deliberate edit rather than an accident.

## Behavioural equivalence with the extracted code

The extraction was checked against a verbatim copy of the removed inline
implementation over randomized arcs. Across roughly 19,000 chapter comparisons
built from numbers, booleans, `null`, `undefined`, `NaN` and negatives, scores
and decisions were identical.

One intentional difference remains. The inline code added block metadata with a
bare `score += b.metadata.danger` and no multiplication, so a truthy non-number
concatenated into the running score: `5 + '2'` became the string `'52'`, which
could then outrank a genuinely higher-scoring chapter. Multiplying by the
weight of 1 normalizes that to numeric addition. It can only trigger on data
that violates the declared `NUMBER` schema, and it is pinned by tests.

Cue signals were already multiplied inline, so a non-numeric cue value still
yields `NaN`, still poisons the chapter's score and still drops it below the
threshold. That suppression is preserved rather than repaired — changing it
would change which chapters the Reader treats as momentous.

Malformed blocks (`null`, primitives, a non-array block collection) are skipped
instead of throwing. Inline, they raised inside the Reader's render memo, which
was a crash rather than a scoring decision.

## Changing a signal in future

The contract, its weights and its tests move together. To add, remove or
reweight a signal:

1. Extend `MomentousChapterSignals` (and `MomentousSourceChapter` if the field
   is newly read off a persisted chapter). Never widen the input to an
   unrestricted generation payload — the narrowness is the protection.
2. Add the weight to `MOMENTOUS_SCORE_WEIGHTS` and the reason name to
   `MomentousReasonSignal`. No literal weights in the scoring body.
3. Emit a reason for every contribution. `reasons` must always sum to `score`;
   a test enforces it.
4. Extend the table-driven suite in `chapterMomentousness.test.ts`: the signal
   in isolation, combinations either side of the threshold, absent and malformed
   values.
5. Reweighting changes how many chapters clear the threshold, which changes how
   many hero images are generated and therefore image cost. Say so explicitly in
   the pull request.
6. Keep `useReaderVisuals` out of it. The boundary test in
   `readerPipelineBoundary.test.ts` fails if the hook reads a scoring field.
