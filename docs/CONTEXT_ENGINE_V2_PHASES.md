# Context Engine v2 — Remaining Implementation Phases

Agent handoff spec. Each phase below is a self-contained, PR-sized task. Do them **in order** — each phase builds on the previous one. Read the "Current state" and "Global guardrails" sections before starting any phase.

## Purpose

Evolve chapter-generation context assembly into a NovelAI-Lorebook-style system: pinned rules stay, a small recent-prose window stays, Codex entities are injected as compact "memory cards" only when relevant, and **everything competes for one fixed token budget** with a deterministic degradation ladder.

## Current state (already merged — do NOT rebuild)

| Piece | Where | Status |
| --- | --- | --- |
| Context manifest (per-section token accounting, stored on chapter, surfaced in reader) | `src/server/contextManifest.ts`, `src/components/ContextInspector.tsx` | ✅ done |
| Lorebook metadata on entities: `aliases`, `contextPriority`, `authorContextNote`, `relevanceState`, `provenance.isUserPinned`, `firstAppeared`, `lastMajorInvolvement` | `src/types.ts` (`BaseCodexEntry`) | ✅ done |
| Alias-aware, pin-forcing, recency-aware entity ranking | `rankRelevantEntities` in `src/server/helpers.ts` | ✅ done |
| Ability-ledger pinning + prompt field trimming | `src/server/helpers.ts` | ✅ done |
| Truncation reporting (`droppedPastSummariesCount`) | `truncateContextIfNeeded` in `src/server/helpers.ts` | ✅ done |

## What is still wrong (the gaps these phases close)

1. Ranked entities are serialized into the prompt as pretty-printed JSON objects (`JSON.stringify(rawMemoryObj, null, 2)` in `src/server/routes/storyRouter.ts`). Token-expensive, and there is no cheap "one-liner" tier — an entity is either a full JSON blob or absent.
2. Two budgets that never see each other: the client packs up to **120,000 chars** of chapter history (`maxContextChars` in `src/lib/rag.ts:49`), then the server separately enforces **80,000 tokens** over memory+history (`truncateContextIfNeeded`). No single allocator; degradation is "shift oldest strings off the front."
3. The recent window is 3 **full-text** chapters (`recentNCount` in `src/lib/rag.ts:50`). Lorebook model wants: last chapter full, chapter −2 trimmed, chapter −3 summary-only.
4. History blocks travel client→server as bare strings; the server (and `classifyHistoryBlocks` in `contextManifest.ts`) re-identifies them by sniffing header text like `"IMMEDIATE CONTINUATION ANCHOR"`. Fragile.
5. `rankRelevantEntities` never sees the continuation anchor (the strongest signal for who is on stage). It scores against premise + last summary + threads only.
6. No rollout flag. Any assembly change hits every story immediately.

---

## Global guardrails (apply to every phase)

- **Never cut or compress**: the continuation anchor, the current chapter premise, the style bible, trope rules, fate-pressure block, or the plot-thread aging annotations (`"Thread open for N chapters — pay it off"`). These carry the current output quality.
- **Backward compatibility**: every new field is optional; stories created before this work must generate identically under the v1 path and correctly (no crashes, sensible defaults) under v2.
- **Manifest stays truthful**: any change to what goes into the prompt MUST be reflected in `buildContextManifest` inputs in the same PR, or the Context Inspector silently lies.
- **No new LLM calls** in the assembly path. Selection stays deterministic (string/alias matching + scores). No embedding calls beyond the existing `/api/embed` usage in `src/lib/rag.ts`.
- **Tests**: this repo runs `npm run lint` (eslint + tsc) and `npx vitest run`. Both must pass. New pure functions get direct unit tests; route behavior gets tests alongside `src/server/routes/storyRouter.contextManifest.test.ts`.
- Applies to all four generation routes in `storyRouter.ts` that build `rawMemoryObj` (chapter stream, chapter non-stream, next-directions, steer-arc) — search for `rankRelevantEntities` call sites.

---

## Phase 2 — Two-tier entity memory cards

**Goal:** replace raw JSON entity blobs in prompts with compact prose "memory cards," each renderable at two tiers, so an entity can be demoted instead of dropped.

### 2.1 New module `src/server/entityCards.ts`

```ts
export type EntityKind = 'character' | 'faction' | 'location' | 'artifact';
export type CardTier = 'full' | 'brief';

export interface RenderedEntityCard {
  name: string;
  kind: EntityKind;
  tier: CardTier;
  text: string;            // final prompt text
  estimatedTokens: number; // via estimateTokens from ./helpers
  pinned: boolean;         // provenance.isUserPinned === true
}

export function renderEntityCard(entity: any, kind: EntityKind, tier: CardTier): RenderedEntityCard;
```

Rendering rules:

- **`full` tier (~150–250 tokens target, hard-cap the text at 1,200 chars):** plain prose lines in this fixed order, skipping absent fields:
  `Name (aliases: a, b)` / `Kind + role/type` / `Status` (character `status`, faction `alignment`, etc.) / `Relationship to MC` / `Description` (truncate 400 chars) / `Author note: <authorContextNote>` (truncate 300 chars, ALWAYS included when present — this is user-authored and overrides brevity) / `Last involved: chapter N` (from `provenance.lastMentionedChapter` ?? `lastMajorInvolvement`).
- **`brief` tier (~25 tokens, hard-cap 160 chars):** one line: `Name — kind, role/relationship-to-MC, current status.` If `authorContextNote` exists, prefer it as the body of the one-liner (truncated).
- Never include: `imageUrl`, `imageHistory`, `embedding`, `voiceClipUrl`, any data-URI (same exclusion set as `HEAVY_KEYS` in `src/lib/slimMemoryForRequest.ts`).
- Deterministic output: same input object → same string. No `Date.now()`, no randomness.

### 2.2 Wire into prompts

In `storyRouter.ts`, where `rawMemoryObj.characters/factions/locations/artifacts` are built from `rankRelevantEntities(...)`: render each ranked entity with `renderEntityCard(entity, kind, 'full')` and place the joined card text into the prompt where the entity JSON used to be, under a heading like `--- CODEX MEMORY CARDS ---`. The `memoryJsonStr` sent to `PROMPTS.chapter.userPrompt` keeps its non-entity fields (powerSystem, worldRules, threads…) as-is; only the four entity arrays change representation. Update `PROMPTS.chapter.system`/`userPrompt` wording if it references entity JSON structure.

### 2.3 Manifest

`buildContextManifest` currently token-counts entities by re-stringifying JSON (`entityText`). Change it to accept the rendered cards (text + tier) and count those. Add `tier` to the included-item labels, e.g. `Character: Mei Lian (full)`.

### 2.4 Tests (`src/server/entityCards.test.ts` + extend route tests)

- Full/brief render for each kind, with and without optional fields.
- `authorContextNote` always survives into both tiers.
- Heavy fields (a base64 `imageUrl`, an `embedding` array) never appear in output.
- Char caps enforced; determinism (render twice, strings equal).
- Route test: generation prompt contains `CODEX MEMORY CARDS` and no `"imageHistory"` / pretty-printed entity JSON.

**Acceptance:** entity token spend in the manifest drops vs. JSON for the same story fixture; all existing tests pass.

---

## Phase 3 — Typed history blocks + unified budgeter

**Goal:** one server-side allocator with a fixed total budget and a per-section degradation ladder; client stops pre-joining history into anonymous strings; recent window becomes 1 full + 1 trimmed + 1 summary.

### 3.1 Typed blocks over the wire

New type in `src/types.ts`:

```ts
export type ContextBlockKind = 'anchor' | 'recent-full' | 'recent-summary' | 'rag' | 'arc-summary';
export interface ContextBlock {
  kind: ContextBlockKind;
  chapterNumber?: number; // for recent-* and rag blocks
  text: string;
}
```

- `retrieveRelevantContext` in `src/lib/rag.ts` returns `ContextBlock[]` instead of `string[]` (keep its internal header strings OUT of block text — the kind field replaces them; keep exporting a legacy `string[]` adapter if other callers need it).
- `buildChapterContext` passes blocks through; the continuation-anchor append becomes `{ kind: 'anchor', chapterNumber, text }`.
- Request schema (`src/server/schemas.ts`): `pastSummaries` accepts the new shape; keep accepting `string[]` for backward compat (old clients / queued retries) and coerce strings to `{ kind: 'recent-summary', text }` after running the existing header-sniff (`classifyHistoryBlocks`) as fallback classifier.
- Client-side reduction: change `retrieveRelevantContext` defaults to `recentNCount: 3` but assemble as — chapter −1 full text; chapter −2 trimmed to its final ~40% of blocks (or `episodicSummary` if longer than ~8,000 chars); chapter −3 summary only. Lower `maxContextChars` default from 120,000 to 60,000. **These reductions apply only when the story runs engine v2 (Phase 5 flag) — thread the flag through `buildChapterContext`.**

### 3.2 New module `src/server/contextBudgeter.ts`

```ts
export interface BudgetedContext {
  promptSections: { key: ContextManifestSectionKey; text: string }[];
  manifestInput: /* everything buildContextManifest needs */;
}
export function assembleContext(input: {
  blocks: ContextBlock[];
  entityCards: RenderedEntityCard[];        // from Phase 2, ranked order
  threads: string[];                        // formatted, aging annotations already applied
  pinned: { premise: string; mcStateCard: string; /* style/trope/fate handled by prompt fn */ };
  worldRules: string[];
  totalBudgetTokens?: number;               // default 24000
}): BudgetedContext;
```

Fill order and per-section caps (defaults; export as a constant so tests pin them):

| Order | Section | Cap (tokens) | Degradation when over budget |
| --- | --- | --- | --- |
| 0 | premise + MC state (never cut) | 1,500 | none — always included |
| 0 | anchor block (never cut) | 2,000 | none — always included |
| 1 | chapter −1 `recent-full` | 6,000 | trim from the FRONT of the block |
| 2 | pinned entity cards (full tier) | 2,000 | demote to brief tier |
| 3 | scored entity cards, descending score | 3,000 | demote to brief; then drop lowest score |
| 4 | threads | 1,500 | drop lowest-relevance, keep newest + oldest-aged |
| 5 | chapter −2 / −3 blocks | 3,000 | degrade full→summary, then drop |
| 6 | `rag` blocks | 2,000 | drop lowest (they arrive relevance-ordered) |
| 7 | `arc-summary` blocks | 1,000 | drop oldest first |

Rules: greedy fill in order; a section may use leftover budget from earlier sections but never exceed the total; every demotion/drop must be recorded so the manifest's `omittedItems`/`omissionReason` reflect it (add omission reasons `demoted_to_brief` and `budget_drop` to the `ContextManifestSection` union). Pure function, no I/O.

### 3.3 Route integration

In each `storyRouter.ts` generation route (v2 path only — see Phase 5): replace the `rawMemoryObj` + `truncateContextIfNeeded` pair with `assembleContext`, feeding its `promptSections` into the prompt template in the current section order. Keep `truncateContextIfNeeded` untouched for the v1 path. Log `contextManifestLogPayload` exactly as today.

### 3.4 Tests (`src/server/contextBudgeter.test.ts`)

- Under-budget input → everything included, zero omissions.
- Oversized entity list → demotions happen in ascending-score order; pinned cards demote but never drop.
- Oversized everything → anchor + premise + chapter −1 survive intact; assert exact degradation order matches the table.
- Manifest output reconciles: sum of section tokens ≤ total budget; every dropped item appears in `omittedItems`.
- Schema test: `string[]` payload still validates and classifies.

**Acceptance:** with a long-story fixture (30+ chapters, 20+ entities), v2 total prompt tokens land near 24k (vs v1's ~2–3×), and the manifest shows the ladder working. `npm run lint` + `vitest` green.

---

## Phase 4 (remainder) — Anchor-aware entity scoring

**Goal:** entities physically present in the immediately-preceding scene reliably win the budget race.

- Extend `rankRelevantEntities` (`src/server/helpers.ts`) with an optional `anchorText?: string` argument. Name/alias hit in anchor text ⇒ forced (score floor 600, between last-summary 500 and pinned 900). Token-overlap hits in anchor weigh 2× premise-token hits.
- Call sites: pass the `anchor` block's text (available once Phase 3 lands; until then, locate the anchor by the existing header sniff).
- Also score `authorContextNote` text for keyword overlap the same way descriptions are scored today.
- Tests: extend `helpers.test.ts` — entity absent from premise/summary but named (by alias) in anchor gets included; anchor forcing does not displace the MC or pinned entities.

---

## Phase 5 — `contextEngine` flag + golden-set A/B

**Goal:** ship v2 dark, compare, then flip the default.

- Add `contextEngine?: 'v1' | 'v2'` to `readerPreferences` on `StoryWorld` in `src/types.ts` (it is already in the Firestore rules allowlist as part of `readerPreferences` — verify, do not widen rules). Default absent ⇒ `'v1'`.
- Client sends it with generation requests (extend `src/server/schemas.ts`); server branches per the Phase 3.3 note. `buildChapterContext` uses it for the recent-window reduction (Phase 3.1).
- UI: a toggle in the story's reader settings (`src/components/ReaderControls/ImmersionSettings.tsx`) labeled "Context Engine v2 (experimental)". Persist via the normal story-update path.
- A/B harness — `scripts/context-ab.ts` (run with `tsx`, not shipped to client): given a story JSON export and a target chapter number, build BOTH v1 and v2 prompts offline (no model call) and write them plus both manifests to `scratch/` files for manual diffing. This is the "golden set" tool: run it on 2–3 real long stories at chapter ~5 and ~25 before flipping any default.
- Manifest gains `engine: 'v1' | 'v2'` so the Context Inspector shows which path produced each chapter.
- Tests: route test asserting v1 request → old assembly (prompt contains pretty-printed entity JSON), v2 request → cards + budgeter.

**Rollout note for the human (not the agent):** if v2 prose feels flatter in golden-set reads, restore chapter −2 to full text (raise section 5's cap) before touching anything else — the recent-window cut is the only change with real quality risk.

---

## Suggested PR breakdown

1. PR A — Phase 2 (entity cards) + manifest tier labels.
2. PR B — Phase 3.1 (typed blocks + schema compat) alone; it is the riskiest interface change and worth isolating.
3. PR C — Phase 3.2–3.4 (budgeter + route integration behind the flag) + Phase 5 flag/UI/harness together (the budgeter cannot ship v2-only without the flag).
4. PR D — Phase 4 remainder (anchor-aware scoring).

Each PR: `npm run lint` and `npx vitest run` must pass; update this file's status table as phases complete.
