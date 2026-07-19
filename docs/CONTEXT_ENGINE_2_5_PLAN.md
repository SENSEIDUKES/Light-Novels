# Context Engine 2.5 — Implementation Plan

**Status:** Planning document — no code changes yet.
**Baseline:** Context Engine V2 as currently shipped (`ACTIVE_CONTEXT_ENGINE = "v2"` in `src/lib/contextBlocks.ts`).
**Goal:** Make every generated chapter a single canonical causal step, and make the next chapter reliably continue from exactly that state — without rebuilding V2.

---

## 0. Current System Map (what 2.5 builds on)

The per-chapter flow lives in `useChapterGeneration.generateOneChapter()` (`src/hooks/useChapterGeneration.ts`) and runs in this order:

| Step | Code | What it produces |
|---|---|---|
| 1. Context build | `buildChapterContext` → `retrieveRelevantContext` (`src/lib/rag.ts`) | Typed `ContextBlock[]` (`arc-summary`, `rag`, `recent-full`, `recent-summary`) plus the **continuation anchor** (`kind: 'anchor'`, final 4 prose blocks of the previous chapter) and a pacing directive |
| 2. Generation | `streamChapterBlocks` → `POST /api/generate-chapter-stream` | Server-side `prepareGenerationContext` → `assembleContext` (`src/server/contextBudgeter.ts`, 24 000-token budget, per-section caps), ranked Codex entity cards, ability ledger in the pinned MC-state card, plot threads, `ContextManifest` |
| 3. Parse | `parseChapterStream` | `data` + `finalRawBlocksStr` |
| 4. Continuity guard | `runContinuityPass` → `/api/check-consistency` + `classifyContinuityWarnings` + `findSurfaceProseLeaks`; repair via `/api/repair-chapter-stream` | Severe faults (deterministically verified dead/destroyed-entity gate), soft notes, possibly repaired prose |
| 5. Metadata | `extractChapterMetadata` → `POST /api/extract-chapter-metadata` | `summary`, `arcSummary`, `cuePayload`, `memoryUpdates` (new/updated characters, artifacts, abilities, threads…) |
| 6. Persist | `persistGeneratedChapter` → `applyMemoryPatch` | Chapter fields, summary embedding, Codex memory patch (entity-resolver dedupe), memory linter |
| Batch | `runSequentialChapterBatch` (`chapterBatch.ts`) | Serial generation; the story returned by each chapter is persisted before the next starts |

**The specific gaps 2.5 closes:**

1. The only chapter-to-chapter carrier of "where exactly did we end" is the raw-prose anchor plus a freeform summary. There is no *structured, authoritative* end state (location, time, who is present, what was just completed, what happens next).
2. Nothing represents "these scenes already happened" — when the second-most-recent chapter degrades to a summary (`reducedRecentBlock`), the model can and does replay a fight, a discovery, or an item acquisition.
3. The premise is a freeform goal string; nothing checks the chapter actually fulfilled it or started where the previous chapter ended.
4. `Artifact` tracks only `currentOwner` + description; there is no condition/possession state, so a destroyed or consumed artifact can reappear intact. The deterministic severe gate in `classifyContinuityWarnings` covers only deceased characters and destroyed factions.
5. Ability dedupe exists (`resolveEntity` in `applyMemoryPatch`), but a duplicate acquisition is *silently dropped* — the prose still shows the MC "learning" a skill they already had, and nothing warns about it. There is no mastery-progression history.

---

## 1. Engine 2.5 Architecture

Engine 2.5 adds **two small structures and one validation stage** around the existing pipeline. Nothing in V2 is replaced.

```
Chapter N generation                       Chapter N+1 generation
────────────────────────                   ─────────────────────────
 prose ──► continuity pass ──► metadata     buildChapterContext
              (Stage A:         extraction    ├─ anchor (unchanged, Layer 1)
               + replay scan)     │           ├─ ChapterContract  ◄─── built from
                                  ▼           │   (Layer 4)             Chapter N handoff
                        ChapterHandoff        └─ blocks/cards/threads (unchanged, Layer 3)
                        + SceneFingerprints
                          (Layer 2)
                                  │
                                  ▼
                        Stage B validation (Layer 5)
                        handoff vs contract, artifacts,
                        abilities, fingerprint dupes
                                  │
                                  ▼
                        persist (chapter + memory + handoff)
```

### 1.1 Canonical Chapter Handoff (Layer 2)

A `ChapterHandoff` is the authoritative machine-readable end state of a chapter. It is extracted **inside the existing `/api/extract-chapter-metadata` call** (schema + prompt extension — no new LLM call), persisted with the chapter, and consumed by the *next* chapter's contract.

Roles:

- **Ending state** — location, time marker, characters on stage, MC condition, unresolved immediate tension.
- **Completed events** — 2–6 one-line canonical statements of what irreversibly happened ("Li Wei defeated Elder Kang in the arena", "The Moonshard Pendant shattered"). These become the do-not-repeat list for subsequent chapters.
- **Next immediate action** — the single beat the next chapter must open on (or explicitly continue past). This is the structured twin of the prose anchor: the anchor preserves *voice*; the handoff preserves *facts*.
- **Scene fingerprints** — compact structured descriptors of each major scene, used for deterministic duplicate detection (see 1.3).

The handoff never repeats Codex data. Ownership rule: **the Codex (Layer 3) owns durable state; the handoff owns the transition.** `stateChanges` in the handoff are references/counts only, because the real state deltas already live in `memoryUpdates` and are applied by `applyMemoryPatch`.

### 1.2 Chapter Contract (Layer 4)

A `ChapterContract` is assembled **deterministically, client-side, with zero LLM calls** in `buildChapterContext`, from data already in hand:

- `startingState` ← previous chapter's `handoff.endState` (verbatim copy, compact).
- `requiredOpening` ← previous `handoff.nextImmediateAction`.
- `objective` ← the target chapter's `premise` (verbatim — the premise is already the intent; the contract just makes it enforceable).
- `doNotRepeat` ← completed-event lines from the last 2–3 handoffs.
- `completionCriteria` ← optional; empty unless the author supplies them (future UI); defaults to "objective visibly advanced".

It is rendered as one small pinned prompt section (`CHAPTER CONTRACT`, capped ≈ 500 tokens) placed directly after the premise section by `assembleContext`, and recorded in the `ContextManifest` so the Context Inspector shows exactly what was enforced.

### 1.3 Scene Fingerprints

A fingerprint is a normalized tuple: **action type** (small closed enum: `battle`, `duel`, `breakthrough`, `acquisition`, `discovery`, `death`, `travel-arrival`, `social`, `training`, `ritual`, `escape`, `revelation`, `other`) + **participants** (canonical names via `resolveEntity`) + **location** + **outcome** (one line) + chapter number.

Two uses, both deterministic:

1. **Prompt-side prevention** — `doNotRepeat` lines derived from recent fingerprints/completed events go into the contract.
2. **Post-generation detection** — the new chapter's fingerprints are compared against the previous N chapters'. A *duplicate candidate* requires all of: same `actionType`, participant-set Jaccard overlap ≥ 0.6, same canonical location (or either unknown), and matching outcome category. This multi-key AND is what keeps rematches legal: a second duel with the same rival in a new location, or with a different outcome, does not match (see §4).

No embeddings, no similarity models — string normalization plus the existing `entityResolver`.

### 1.4 Artifact & Ability tracking extensions

- **Artifacts** gain optional `condition` (`intact | damaged | destroyed | consumed | lost`), `holderLocation`, and `lastStateChapter`. `artifactUpdates` in the metadata schema gains `newCondition` / `newLocation`. The deterministic severe gate in `classifyContinuityWarnings` is extended with the exact pattern it already uses for dead characters: an artifact whose Codex `condition` is `destroyed`/`consumed`, named in the new prose in an active role, is a verified severe fault.
- **Abilities** gain optional `progression: AbilityProgressionEvent[]` (append-only mastery history written by `applyMemoryPatch` when `mcAbilityUpdates` changes `masteryLevel`). Duplicate acquisitions (`newMCAbilities` resolving to an existing ability) stop being silently dropped: they are **converted** into an `mcAbilityUpdates`-style mastery/refinement event and emit a soft warning, so the ledger never gains a twin and the replay is visible.

### 1.5 How continuity enforcement improves

| Failure mode today | 2.5 mechanism |
|---|---|
| Chapter re-establishes or replays the previous chapter's climax | Contract `startingState` + `requiredOpening` in prompt; Stage A replay scan (prose vs prior completed events); Stage B fingerprint match |
| Chronology rewind (chapter opens before the previous ending) | `startingState` is pinned; Stage B compares new handoff's opening context against contract (warning) |
| Destroyed/consumed artifact reappears | Deterministic condition gate (severe, repairable — same machinery as the dead-entity gate) |
| MC "learns" an ability twice | Dedupe upgraded from silent drop to convert-and-warn; ledger stays canonical |
| Premise ignored | Contract in prompt + `contractReport.objectiveFulfilled` from the metadata call (warning only — never auto-repaired) |
| Batch chapter starts from stale state | Already handled by `runSequentialChapterBatch` persistence; handoff rides the same persistence, so the guarantee extends to structured state |

---

## 2. Data Structures

All new fields are optional; every existing story, chapter, and stored `ChapterContent` deserializes unchanged. Additions go in `src/types.ts`.

```ts
// ── Scene fingerprint ────────────────────────────────────────────────
export type SceneActionType =
  | "battle" | "duel" | "breakthrough" | "acquisition" | "discovery"
  | "death" | "travel-arrival" | "social" | "training" | "ritual"
  | "escape" | "revelation" | "other";

export interface SceneFingerprint {
  /** Closed-enum action class; unknown model output maps to "other". */
  actionType: SceneActionType;
  /** Canonical entity names (resolved through entityResolver at persist time). */
  participants: string[];
  location?: string;
  /** One-line outcome, e.g. "Li Wei wins, Elder Kang crippled". */
  outcome: string;
  chapterNumber: number;
}

// ── Canonical chapter handoff ────────────────────────────────────────
export interface ChapterEndState {
  location?: string;
  /** Freeform but short: "dusk, same day", "three days later". */
  timeMarker?: string;
  charactersPresent: string[];
  /** Physical/emotional MC condition: "exhausted, qi depleted, left arm broken". */
  mcCondition?: string;
  /** The live tension the chapter ends on (hook), one line. */
  openTension?: string;
}

export interface ChapterHandoff {
  version: 1;
  chapterNumber: number;
  endState: ChapterEndState;
  /** 2–6 one-line canonical, irreversible facts established this chapter. */
  completedEvents: string[];
  /** The single immediate beat the next chapter opens on. */
  nextImmediateAction?: string;
  fingerprints: SceneFingerprint[];
  /**
   * Reference-only counts of state deltas; the deltas themselves live in
   * memoryUpdates / the Codex. Prevents redundant storage.
   */
  stateChangeDigest?: {
    abilitiesGained?: string[];   // names only
    artifactsChanged?: string[];  // names only
    threadsOpened?: number;
    threadsResolved?: number;
  };
}

// ── Chapter contract ─────────────────────────────────────────────────
export interface ChapterContract {
  version: 1;
  chapterNumber: number;
  /** Copied from the previous handoff's endState; empty for chapter 1 / gaps. */
  startingState?: ChapterEndState;
  /** Copied from the previous handoff's nextImmediateAction. */
  requiredOpening?: string;
  /** The chapter premise, verbatim. */
  objective: string;
  /** Completed-event lines from the last 2–3 handoffs. */
  doNotRepeat: string[];
  /** Optional author-supplied criteria; absent = "objective visibly advanced". */
  completionCriteria?: string[];
}

/** Returned by the extended extract-chapter-metadata call. */
export interface ContractReport {
  objectiveFulfilled: boolean;
  /** One-line evidence quote/paraphrase when fulfilled. */
  evidence?: string;
  /** Whether the chapter opened consistent with requiredOpening/startingState. */
  openingMatched?: boolean;
}

// ── Artifact extension (fields added to existing Artifact) ──────────
export type ArtifactCondition =
  | "intact" | "damaged" | "destroyed" | "consumed" | "lost" | string;

export interface Artifact extends BaseCodexEntry {
  // ...existing fields unchanged (id, name, description, tier, currentOwner, …)
  condition?: ArtifactCondition;      // absent = intact (legacy default)
  holderLocation?: string;            // where it physically is, if known
  lastStateChapter?: number;          // last chapter that changed owner/condition
}

// ── Ability progression extension (fields added to existing Ability) ─
export interface AbilityProgressionEvent {
  chapter: number;
  fromMastery?: string;
  toMastery?: string;
  /** "duplicate acquisition merged", "breakthrough during duel", … */
  note?: string;
}

export interface Ability extends BaseCodexEntry {
  // ...existing fields unchanged (acquiredChapter, masteryLevel, lastUsedChapter, …)
  progression?: AbilityProgressionEvent[];
}
```

**Storage placement (ownership of fields):**

| Structure | Stored on | Why |
|---|---|---|
| `ChapterHandoff` (full) | `ChapterContent.handoff` | Content doc is already loaded for the anchor in `buildChapterContext`, so the previous handoff costs zero extra reads |
| `SceneFingerprint[]` (copy) | `Chapter.sceneFingerprints` | The `Chapter` scaffold is always in memory (it already carries `summary` + `embedding`); building `doNotRepeat`/dupe checks across N chapters must not require N content loads. Fingerprints are ~100–200 bytes each — the only intentional duplication, justified by access pattern |
| `ChapterContract` | `ChapterContent.contract` + echoed in `ContextManifest` | Debug/inspection; the contract is otherwise transient |
| `ContractReport` | `Chapter.contractReport` | Surfaced in UI next to continuity notes |
| Artifact/Ability extensions | Existing Codex entities in `StoryMemory` | Layer 3 stays the single owner of durable state |

**Manifest compatibility:** add `"chapterContract"` to `ContextManifestSectionKey` and a label in the Inspector's key→label map. `ContextManifest.version` stays `1` (additive optional section; existing manifests render unchanged).

---

## 3. Pipeline Integration

Changes annotated on the existing flow (client hook `generateOneChapter`, server `storyRouter.ts`):

### 3.1 `buildChapterContext` (chapter N+1 start)

Already loads `prevContent` for the anchor. Add:

1. Read `prevContent.handoff` (may be absent → contract has no `startingState`, everything still works).
2. Collect fingerprints/completed events from the last 2–3 chapters via `Chapter.sceneFingerprints` / a small `completedEvents` echo (no extra content loads).
3. Build `ChapterContract` deterministically and return it alongside `pastSummaries` and `pacingDirective`.

### 3.2 `streamChapterBlocks` → `/api/generate-chapter-stream`

- Request body gains optional `chapterContract` (zod: `chapterGenerationSchema` in `src/server/schemas.ts`).
- `prepareGenerationContext`/`assembleContext` render it as a new section between `premise` and `anchor`:

```
--- CHAPTER CONTRACT ---
Opening state: <location> | <timeMarker> | present: <names> | MC: <condition>
Open with / continue from: <requiredOpening>
Objective: <objective>
ALREADY HAPPENED — never re-narrate or replay:
- <completedEvent line> (Ch. N)
- <completedEvent line> (Ch. N-1)
```

- New section cap `chapterContract: 500` in `CONTEXT_BUDGET_DEFAULTS.sectionCaps`; unused allocation carries forward like every other section. Net prompt growth ≈ 300–500 tokens on a 24 000-token budget (~2 %).
- Section recorded in the manifest → Context Inspector shows it with included/omitted `doNotRepeat` lines.
- One short system-prompt paragraph in `PROMPTS.chapter.system` (v2 path only) explaining contract semantics ("the contract is canon; the anchor shows the last lived moment; continue forward, never re-play completed events").

### 3.3 `runContinuityPass` — Stage A (pre-reveal, unchanged position)

- New deterministic **replay scan**: match prior `completedEvents`/fingerprints against the new prose using the same whole-word matcher machinery as `classifyContinuityWarnings` (participants + action-type keyword families). High-confidence hits join `classified.severe` and flow into the **existing** repair stream (`repairChapterStream`) — no new endpoints.
- The `/api/check-consistency` request gains optional `handoffContext` (previous end state + do-not-repeat lines) appended to the memory payload so the advisory guard LLM can also flag replays/rewinds — reusing the existing call, and its proposals stay advisory exactly as today.
- Artifact condition gate added to `collectDeadEntityMatchers`' pattern (destroyed/consumed artifacts).

### 3.4 `extractChapterMetadata` → `/api/extract-chapter-metadata`

- Request gains optional `contract` (objective + requiredOpening + doNotRepeat) so the extractor can judge fulfillment in the same pass.
- Response schema gains `handoff` (end state, completed events, next action, fingerprints) and `contractReport`. Same single LLM call as today.
- `artifactUpdates` gains `newCondition`/`newLocation`; `newMCAbilities`/`mcAbilityUpdates` unchanged in shape.

### 3.5 New: `validateChapterHandoff` — Stage B (deterministic, no LLM)

A new pure function in `src/hooks/chapterPipeline/`, run between metadata extraction and persistence:

- Fingerprint dupe check (new fingerprints vs last N chapters').
- Opening-state consistency (new chapter's implied opening vs contract `startingState` — only when both sides are populated).
- Artifact sanity: `memoryUpdates.artifactUpdates`/`newArtifacts` vs Codex (owner set to a deceased character, destroyed artifact re-acquired, artifact "found" that already has an owner).
- Ability sanity: `newMCAbilities` that resolve to existing ledger entries → converted to progression events + soft warning.
- Output: `{ hardFaults: string[], warnings: string[] }` merged into `hasContinuityFaults` / `continuityWarnings` / `continuitySoftNotes` on the chapter (existing UI surfaces them for free).

### 3.6 `persistGeneratedChapter` / `applyMemoryPatch`

- Persist `handoff` on `ChapterContent`, `sceneFingerprints` + `contractReport` on `Chapter`, `contract` on `ChapterContent`.
- Canonicalize fingerprint participant names through `resolveEntity` before storing.
- `applyMemoryPatch`: apply `newCondition`/`newLocation`/`lastStateChapter` on artifacts; append `AbilityProgressionEvent` on mastery changes; duplicate-acquisition conversion (also fixes the in-place mutation of ability objects in the current `mcAbilityUpdates` branch).
- Batch flow (`runSequentialChapterBatch`) needs **zero changes**: it already persists the full story between iterations, so chapter N+1's `buildChapterContext` naturally sees chapter N's handoff.

### 3.7 Interaction with existing context classes

- **Anchor:** untouched — still the last prose blocks, still protected in the budgeter. The contract complements it (facts vs voice) and deliberately duplicates nothing from it.
- **Recent-history window:** untouched (`reducedRecentBlock` strategy preserved). The contract specifically compensates for its known lossy case (chapter N-1 demoted to summary).
- **Memory cards / ability ledger / threads:** untouched; the contract references entities by name only, never restates card content.
- **Context Inspector:** gains one section; all existing sections and manifests unchanged.

---

## 4. Continuity Enforcement Strategy

### Deterministic checks (primary — cheap, provider-independent, no false-authority)

| Check | Mechanism | Class |
|---|---|---|
| Scene replay (prose) | Stage A: prior completed-event participants + action-keyword family both present in new prose, whole-word matched | **Hard** only when the matched prior event is from the immediately previous 2 chapters and includes a unique irreversible marker (death, destruction, first acquisition); otherwise soft |
| Scene replay (structured) | Stage B: fingerprint multi-key AND match (actionType + participants ≥ 0.6 Jaccard + location + outcome category) | Hard fault flag on exact match vs previous chapter; soft for older/partial matches |
| Chronology rewind | Stage B: contract `startingState` populated but new chapter's fingerprints/opening reference the prior chapter's *pre*-climax state (e.g. a `death`/`destroyed` participant active again) | Soft warning (time skips and flashbacks are legitimate; see below) |
| Artifact inconsistency | Codex `condition ∈ {destroyed, consumed}` + artifact named actively in prose (Stage A severe gate); owner/condition conflicts in `memoryUpdates` (Stage B) | Hard (Stage A, repairable) / warning (Stage B) |
| Ability duplication | `resolveEntity` on `newMCAbilities` vs ledger | Auto-corrected (merge to progression event) + soft warning — never blocks |
| Objective ignored | `contractReport.objectiveFulfilled === false` | Soft warning only |

### LLM-based checks (reusing existing calls only)

- `/api/check-consistency` (already called): sees `handoffContext`; may propose replay/rewind warnings. As today, its proposals are **downgraded to soft unless deterministically verified** — the `classifyContinuityWarnings` philosophy is preserved and extended, not bypassed.
- `/api/extract-chapter-metadata` (already called): produces the handoff and `contractReport`. It judges its *own chapter in isolation*, which keeps it reliable; cross-chapter judgments stay deterministic.

### Legitimate variation must survive

- **Rematches:** require matching outcome + location; a rematch in a new place or with a different result never fingerprint-matches. Premises containing rematch intent ("again", "rematch", "return to") force dupe findings down to soft.
- **Time skips:** `timeMarker` is informational; chronology checks fire only on *state* contradictions (dead participant active, destroyed artifact used), never on time distance.
- **Flashbacks/recaps:** Stage A replay scan exempts prose inside explicit recap framing is *not* attempted (too fragile); instead the hard threshold (irreversible-marker events from the last 2 chapters only) keeps brief in-dialogue references and memories from triggering repair.

### Soft warnings vs hard repair triggers

**Hard (repair attempted, pre-reveal, Stage A only):** verified dead-entity prose (existing), destroyed/consumed-artifact-in-action (new), verified replay of an irreversible event from the last 2 chapters (new).
**Soft (persisted notes, no repair):** everything else — fingerprint near-matches, opening mismatch, objective unfulfilled, ability merges, older replays, guard-LLM proposals.

---

## 5. Validation and Repair Flow

```
prose finalized
   │
   ├─ Stage A (runContinuityPass — existing position, pre-reveal)
   │    validated: dead entities, destroyed artifacts, replay of recent
   │               irreversible events, surface leaks, guard-LLM proposals
   │    repair trigger: any verified severe fault or surface leak
   │    repair: existing /api/repair-chapter-stream, re-check once,
   │            unrepaired severe ⇒ hasContinuityFaults (red box) — unchanged
   │
   ├─ metadata extraction (handoff + contractReport produced here)
   │
   ├─ Stage B (validateChapterHandoff — new, deterministic, no LLM)
   │    validated: fingerprint dupes, opening-state consistency,
   │               artifact owner/condition sanity, ability duplication,
   │               objective fulfillment (from contractReport)
   │    repair trigger: none (prose is final; repairing here would
   │                    invalidate the just-extracted metadata)
   │    outputs: warnings/soft notes on the chapter; exact fingerprint
   │             match vs previous chapter may set hasContinuityFaults
   │    auto-corrections: ability duplicate → progression merge;
   │                      malformed fingerprints dropped
   │
   └─ persist (handoff always persisted, even when warnings exist —
       an imperfect canonical record beats none; warnings ride along)
```

**Allowed to pass silently:** chapters with no handoff (legacy/failed extraction — engine degrades to exactly today's V2 behavior), unknown locations/time markers, quiet chapters whose `contractReport` shows fulfillment via internal/relationship progression, any check where either side of a comparison is unpopulated. **The failure posture is always "degrade to V2", never "block generation".** If metadata extraction fails entirely (already handled with a fallback summary), no handoff is stored and the next chapter simply gets a contract without `startingState`.

---

## 6. Minimal Implementation Phases

Each phase ships independently, is feature-complete on its own, and touches disjoint seams.

**Phase 1 — Handoff extraction & persistence** (foundation, no behavior change to prompts)
`types.ts`, `schemas.ts` (`extractMetadataSchema`), metadata response schema + `PROMPTS.extractMetadata`, `persistGeneratedChapter`. After this, every new chapter stores a handoff + fingerprints. Testable in isolation: extraction schema round-trip, persistence, legacy chapters unaffected.

**Phase 2 — Chapter contract in the prompt**
`buildChapterContext` (contract assembly), `chapterGenerationSchema`, `contextBudgeter` (new section + cap), `contextManifest` + Inspector label, one system-prompt paragraph. Testable: contract built correctly from a stored handoff; absent-handoff path; budgeter section caps; manifest snapshot tests (`storyRouter.contextManifest.test.ts` pattern).

**Phase 3 — Stage B deterministic validation**
New `validateChapterHandoff.ts` + wiring in `generateOneChapter` between metadata and persist. Pure functions → trivially unit-testable. Warnings surface through existing chapter fields/UI.

**Phase 4 — Stage A hard gates & repair integration**
Replay scan + artifact-condition gate in `classifyContinuityWarnings`/`checkChapterContinuity`; `handoffContext` passthrough to `/api/check-consistency`. Testable against the existing `runContinuityPass.test.ts` harness.

**Phase 5 — Artifact & ability state extensions**
`artifactUpdates.newCondition/newLocation` extraction, `applyMemoryPatch` condition/location/progression handling, duplicate-ability conversion (incl. the in-place mutation fix). Testable purely through `applyMemoryPatch.test.ts`.

Dependencies: 2–4 need 1; 5 is independent of 2–4 (only needs the schema seam from 1); 3 and 4 are independent of each other.

---

## 7. Test Plan

Vitest, colocated `.test.ts`, following existing patterns (`applyMemoryPatch.test.ts`, `runContinuityPass.test.ts`, `contextBudgeter.test.ts`).

| Area | Regression tests |
|---|---|
| **Duplicate scene prevention** | Fingerprint match: identical duel next chapter ⇒ hard; same duel, new location ⇒ pass; same participants, different actionType ⇒ pass; Jaccard threshold boundaries; Stage A replay scan fires on prior death/acquisition re-narrated, not on a one-line memory reference |
| **Chronological continuity** | Contract carries prior endState verbatim; chapter 1 / missing handoff ⇒ contract without startingState; failed extraction on N ⇒ N+1 degrades to plain V2; batch: handoff from N visible to N+1 through `runSequentialChapterBatch` persistence |
| **Artifact state** | destroyed artifact named actively ⇒ Stage A severe + repair attempted; `newOwner` = deceased character ⇒ Stage B warning; condition/location/`lastStateChapter` applied by `applyMemoryPatch`; legacy artifacts without `condition` treated as intact everywhere |
| **Ability progression** | duplicate `newMCAbilities` ⇒ merged to progression event + soft warning, ledger count unchanged; mastery change appends progression event; string-form legacy abilities unaffected; no in-place mutation of prior memory |
| **Objective fulfillment** | `contractReport.objectiveFulfilled=false` ⇒ soft warning only, chapter persists; fulfilled with evidence ⇒ no warning |
| **Legitimate variation** | time-skip chapter (new timeMarker, no state contradiction) ⇒ zero findings; rematch premise ⇒ dupe downgraded to soft; flashback dialogue referencing a completed event ⇒ no hard fault |
| **Quiet chapters** | social/training chapter with valid progression ⇒ passes; handoff extracted with `social` fingerprints; no pacing interference |
| **Prompt/budget** | contract section respects its cap; overflow drops oldest `doNotRepeat` lines first; manifest reports the section; total prompt growth bounded in `contextBudgeter.test.ts` |
| **Backward compat** | stories with zero handoffs generate identically to today (golden-path snapshot of prepared context without contract); `ContextManifest` v1 consumers render new section or ignore it |

---

## 8. Risks and Tradeoffs

- **False positives in duplicate detection.** The main risk. Mitigated by the multi-key AND match, the irreversible-marker requirement for hard faults, premise-intent downgrades, and restricting hard faults to a 2-chapter lookback. Bias is deliberately toward soft warnings; hard replay faults should be rare and near-certain.
- **Over-constraining creativity.** The contract states facts and prohibitions, not style or structure; `objective` is the author's own premise verbatim; objective fulfillment never repairs. `requiredOpening` is phrased as "open with or continue past", so a chapter may summarize the beat in a sentence and move on.
- **Metadata inaccuracies.** The handoff is produced by the same LLM pass that already produces `memoryUpdates`, with the same failure modes. Mitigations: enum-clamped `actionType`, `resolveEntity` canonicalization of participants, fingerprints dropped when malformed, and all downstream checks tolerating absent fields. A bad handoff degrades to V2 behavior rather than corrupting state.
- **Prompt size impact.** ~300–500 tokens (~2 % of the 24 000 budget), inside its own capped section, so it can never crowd out the anchor or recent chapter (which have their own protected allocations).
- **State synchronization.** Fingerprints are intentionally duplicated on `Chapter` (scaffold) while the full handoff lives on `ChapterContent`. Both are written in the same `persistGeneratedChapter` pass, the same place `summary`/`embedding` are already dual-written, so no new sync surface. Regeneration of a chapter overwrites both atomically.
- **Ability merging ambiguity.** "Sword Heart" vs "Heart of the Sword" resolution rides on the existing `entityResolver`; a wrong merge now leaves a visible progression event + warning instead of a silent drop — strictly more auditable than today. Genuinely new sibling abilities that over-merge can be split manually via the Codex UI (existing capability).
- **Performance.** Stage B and the replay scan are pure string/set operations over ≤ a few dozen fingerprints — negligible. No new LLM calls anywhere in the recommended scope; extract-chapter-metadata output grows modestly (a few hundred output tokens).
- **Model-provider independence.** All new prompt content is plain text sections; extraction uses the existing structured-output schema plumbing (`routeTextGeneration` with schema), which is already provider-routed.

---

## 9. Recommended Scope

### Minimal Patch (Phases 1–2)
Handoff extraction + persistence, and the chapter contract in the prompt. No new validation at all. This alone fixes the highest-impact failure (the model not *knowing* the authoritative end state and recently-completed events) and measurably reduces replay and premise drift, with ~2 % prompt growth and zero new failure surfaces.

### Recommended Engine 2.5 (Phases 1–4)
Minimal Patch plus Stage B deterministic validation and the Stage A hard gates (replay scan + artifact-condition gate wired into the existing repair flow). This is the balanced target: prevention in the prompt, deterministic detection after generation, repair reusing existing machinery, everything optional-field backward compatible. Phase 5 (artifact condition/location + ability progression) is small and low-risk and can ship alongside or immediately after.

### Future Extensions (defer until 2.5 is validated)
- Author-editable contracts and completion criteria in the chapter-planning UI.
- Handoff-aware regeneration: when the user regenerates chapter N, invalidate/rebuild downstream handoffs.
- Embedding-based scene similarity as a *secondary* dupe signal (only if deterministic matching proves insufficient).
- Cross-arc fingerprint index for very long stories (replay detection beyond the recent window).
- Backfill job: extract handoffs for existing chapters of ongoing stories.
- Contract-aware premise generation (`/api/generate-next-directions` consuming the latest handoff).

---

## 10. Final Recommendation

**Implement Phase 1 first, then Phase 2, and ship them together as the first release.**

Phase 1 is the keystone: it creates the canonical record (handoff + fingerprints) inside an LLM call and a persistence path that already exist, with zero user-visible change and zero risk to current generation. Phase 2 then immediately converts that record into the largest available quality win — the model being *told*, in a compact pinned section, exactly where the story stands, what it must accomplish, and what it must not replay. Prevention in the prompt is worth more than detection after the fact, and these two phases deliver it for ~2 % prompt overhead and no new LLM calls.

Phases 3–4 follow once a few batches of real chapters have produced handoffs to validate against — their thresholds (Jaccard cutoff, lookback depth, hard-fault markers) should be tuned on real extracted fingerprints rather than guessed. Phase 5 can ride with either release.

This ordering keeps every step reversible, keeps V2 as the always-available degradation path, and turns each chapter into what the objective demands: a canonical causal step the next chapter provably continues from.
