# SEIHOUSE — Celestial Library & SEN

**Last updated: July 25, 2026**

Celestial Library is SEIHOUSE's living light-novel studio: a place to shape a
world, write its future with AI, read it as an immersive serial, and watch its
people, places, relics, and consequences become part of a persistent story
memory. It is built for cultivation fantasy, LitRPG, romance, mystery, cozy
fiction, and any serial story that benefits from a world that remembers.

**SEN** is the immersive reading mode inside the Celestial Library. In the
codebase it is `readerMode: "sen"`: narration keeps the active paragraph in
focus and can coordinate cinematic scrolling and visual reveals. SEN is not a
separate product or backend; it is the most focused way to enter a story.

---

## 🌌 Brand Philosophy, Color Palette & Identity

**MISSION**: *“SEIHouse exists to make a better time capsule and translator of
artistic expression: meaning-first creator infrastructure for music and
narrative fiction.”*

- 🖤 **Foundation / Void & Depth** (`#000000`) — the dark canvas beneath an
  endless library of worlds.
- ⬜ **Signal / Clarity** (`#FAFAFA`) — calm, legible scripture for long-form
  reading.
- 🩸 **Human / Emotional Core** (`#8B0000`) — trials, bloodlines,
  breakthroughs, and consequence.
- 🌐 **Portal / Consciousness Signal** (`#04ACFF`) — the light of systems,
  Codex knowledge, and active imagination.

The visual system pairs Alegreya/Alegreya SC for grand titles, Rubik for
controls and systems, and Noto Serif for the reading surface. The goal is not
to make a database look mystical; it is to make a serious reading and creation
space feel like a place worth returning to.

---

## 🏛️ The Celestial Library Experience

### Create a world, then give it a future

**For readers and creators.** Start with the kind of story you want to enter:
premise, genre, world, protagonist, custom characters and factions, power
system, plot controls, content preferences, and the details that make a realm
feel yours. The Library turns that intake into a reviewable world blueprint,
then into an opening story that can keep growing chapter by chapter.

**For developers.** `CreationPortal` composes the structured intake and calls
the blueprint and initial-story generation flows. A **Story Seed** preserves
the intake plus blueprint for a signed-in account, so a world can be reused,
imported, exported, or shared where native sharing is available. Seeds are
first-class account data, not just a browser form snapshot.

### Generate chapters without losing the thread

**For readers and creators.** A new chapter is more than a wall of generated
text. It arrives as a sequence of readable story blocks, carries forward what
the world knows, produces summaries and meaningful updates, and can be checked
before it is sealed into the chronicle. When inspiration is flowing, **Generate
next five** continues a sequence without asking the story to forget the
chapters it just wrote.

**For developers.** The active Context Engine is v2. The chapter pipeline
builds compact story-aware context, streams structured blocks, extracts
metadata, runs continuity checks, and persists generated content. Five-chapter
generation is a sequential batch with recorded item state, so completed work,
failures, and a later resume are visible instead of hidden inside one large
provider response.

### Guide a destiny instead of only consuming it

**For readers and creators.** **Steer Story Fate** gives the next arc an
intent—darker, more romantic, more dangerous, or entirely your own. **Alter
Fate** lets you fork at a chapter and discover what happens when the chosen
path changes, while keeping the original timeline intact.

**For developers.** Arc steering asks the planner for new chapter premises and
updates the story's next arc. Alter Fate creates a new story branch with the
prior chapters and bookmarks up to the selected point, then generates forward
from that branch. Fate locks protect a chapter while a generation batch makes
a fork unsafe.

---

## 📖 Reader Chamber — The Scripture Meridian

**For readers.** The Reader Chamber is the heart of the Library: a long-form
reading space with chapter navigation, bookmarks, restore position, semantic
Codex highlights, World Cards, system panels, glossary access, full-screen
reading, and the choice to simply read or let the story perform itself. Normal,
teleprompter, basic narration, and SEN modes meet different moods without
turning the novel into a game UI.

**For developers.** `ReaderChamber` composes the viewport, controls,
translation, playback, visual reveals, cinematic scroll, and reader
preferences. The reader supports keyboard shortcuts, labelled controls,
focus-management components, responsive Codex navigation, swipe navigation,
and device-supported haptics. Typography and atmosphere are story preferences,
not scattered component state: font, scale, spacing, alignment, themes,
highlights, and player style travel with the reader experience.

### Read across moments and devices

**For readers.** A return to the Library should feel like opening a book where
you left a ribbon. Cached stories remain readable offline, and changes made
while disconnected can return when the connection does.

**For developers.** The app is a Vite PWA with an auto-updating service worker
and selected runtime caches. Story data has an owner-scoped IndexedDB replica
and durable mutation outbox. It is a resilience layer, not a second permanent
library: AI generation and fresh private-media delivery still require their
network services, and the cloud record remains authoritative after
reconciliation.

---

## 🔮 The Living Codex

**For readers.** The Living Codex is the companion book inside every story. It
does not just list names: it turns the living shape of a novel into something
you can inspect, remember, and edit. Meet its current chambers:

| Chamber | What it reveals |
| --- | --- |
| **Portraits** | Characters, beasts, locations, factions, visual recaps, and image history. |
| **Karma** | Relationships, mysteries, and unresolved plot threads. |
| **Power Rankings** | Power stages, abilities, and cultivation analytics. |
| **Artifacts** | Relics and their lasting story state. |
| **Fate** | Timeline, consequence, and world-molding controls. |
| **Lore** | Glossary, story rules, arcs, and supporting knowledge. |

**For developers.** The generation pipeline applies structured memory updates
to story state; the Codex renders that state through specialized sections for
characters, locations, factions, relations, threads, artifacts, Fate, and
glossary data. Author-controlled Codex context remains explicit—developers
should preserve `contextPriority` and `authorContextNote`, and should not let a
model silently invent aliases.

### World Cards and manifestations

**For readers.** A major first appearance deserves more than a noun in a
paragraph. **World Cards** give a character, creature, artifact, faction,
location, system event, or Fate event a moment of ceremony. **Manifestations**
let story-significant people, beasts, places, factions, and relics become
visuals; momentous chapters can receive a hero image, and every story can
forge a cover that fits its own world.

**For developers.** Cards are structured generation output with visible copy,
semantic sound intent, and a short `audioText`; models do not select asset
filenames, URLs, or storage keys. The client resolves the intent through the
curated catalog. Manifestation eligibility deliberately filters incidental
details, while image generation is quota protected and preserves the resulting
asset/history relationship. Covers, chapter-hero images, manifestations, and
cultivator portraits use the same permanent-media path.

---

## ⚔️ Fate, Relics, and Cultivation

**For readers.** Celestial Library makes consequence visible without forcing
every genre into LitRPG. Fate results and timelines show how a choice changes a
path. Relics carry ownership and condition. The cultivator profile records Dao
progression, ranks, aura expression, inventory rewards, and status effects as
you read and act inside the Library.

**For developers.** Fate, power, artifact, relationship, thread, and timeline
state are represented in the story memory/Codex model and updated through the
chapter and steering flows. Keep durable relic state distinct from a temporary
mention in prose; the manifestation gate and continuity checks are deliberately
conservative. Existing Sects and challenge screens are present, but a complete
community marketplace or contribution economy is not a shipped claim.

---

## 🎧 Audio, Narration, Translation, and Visual Atmosphere

### A score for the story, not noise around it

**For readers.** Music can follow the pressure of a scene, atmosphere can hold
rain, wind, or a cavern's hush, and rare moments can land with a deliberate
cue. Every channel has its own control, including master audio, music,
atmosphere, and one-shot effects; a pinned track is available when you want to
keep a mood longer.

**For developers.** Scene scoring, looping atmosphere, and card/cinematic
one-shots are separate systems. The audio conductor resolves semantic narrative
metadata against a curated catalog and crossfades appropriate tracks and beds.
Unsupported cues intentionally stay silent rather than triggering synthetic or
guessed sounds. Preserve the `assetFamily`/role distinction: a card's one-shot
is not a looping atmosphere bed.

### Voices and translations

**For readers.** The Reader Chamber can narrate a chapter with distinct
narrator, protagonist, and side-character voices, highlight the active text,
and move the cinematic reading surface with the voice. Chapters can also be
translated while retaining their story-specific terminology where the selected
provider supports it.

**For developers.** Reader-wide narration uses the browser Web Speech API.
Kokoro belongs to the separate generated character-voice-card path and does
not replace browser narration; current preset coverage is English and Spanish.
Translation stores a chapter result by language, tries DeepL with a temporary
glossary when available, and falls back to the configured text-generation
route. Browser voice availability, provider credentials, quota, and target
language all remain real constraints.

---

## 🛡️ A Library That Remembers

**For readers.** Sign in to keep your worlds, Seeds, Codex, progress,
translations, images, profile, and media connected to your account. The
experience is designed so a cover, portrait, or chapter memory belongs to the
world it came from—not to a transient browser tab.

**For developers.** Firebase Authentication provides the account session.
Structured application records live in PostgreSQL through Firebase Data
Connect; permanent user-owned media lives in private Cloudflare R2; IndexedDB
is the local cache/outbox; and the curated audio catalog remains separate in
checked-in/public R2 namespaces. Postgres stores relational state and media
metadata, never permanent media bodies. Firestore and Firebase Storage are not
active application persistence paths.

This is intentionally brief. The ownership rules, media lifecycle, deletion
jobs, quota behavior, and deployment credentials are documented in
[PERSISTENCE_MEDIA_CUTOVER.md](docs/PERSISTENCE_MEDIA_CUTOVER.md).

---

## ✨ What is ready, what is growing

### Ready in the application

Story creation and Seeds; streamed chapter and sequential-batch generation;
Reader Chamber modes and preferences; Living Codex; Fate steering and forks;
cover, hero, portrait, and manifestation media; curated scene audio; browser
narration; translation routes; account-backed persistence; and offline
cache/outbox behavior are implemented in this repository.

### Dependent on the reader's environment

Live AI text, image, translation, and Kokoro voice results require configured
providers and may be limited by availability, quota, or language support.
Browser narration depends on device voices. Deployed persistence/media flows
need their protected Firebase, Data Connect, Workload Identity, and R2
configuration; emulator coverage is not a substitute for a configured hosted
environment.

### Still growing

Full CJK, RTL, complex-script, and multilingual TTS support is not complete;
see the [language expansion audit](glossary/language_expansion_audit.md).
Community marketplace, broad sect-economy, and contribution-hall behavior are
future product work, not promises made by the current screens.

---

## 🚀 Development

### Setup

Install dependencies, then copy the environment template:

```bash
npm ci
Copy-Item .env.example .env # PowerShell
```

[`.env.example`](.env.example) is the authoritative configuration list. Live
generation needs at least one AI provider credential. Authenticated
persistence/media integration needs Firebase/Data Connect and R2 server-side
configuration. Never commit provider keys, R2 secrets, or a service-account
private key.

### Local commands

```bash
npm run dev                 # Express API + Vite on port 3000
npm run build               # production client and Node server bundle
npm run start               # run the production bundle locally
npm run lint                # ESLint + TypeScript
npm test                    # Vitest
npm run test:coverage       # coverage suite
npm run test:e2e            # Playwright critical paths
npm run dataconnect:compile # Data Connect SDK/schema verification
npm run test:foundation:e2e # Auth/Data Connect ownership suite
```

`npm run test:foundation:r2:live` and
`npm run foundation:media:maintenance` touch real infrastructure. Use only the
documented protected environment and disposable records.

### Deployment and deeper documentation

Vercel serves the Vite client and bundles `server-bundle/entry.ts` for `/api/*`.
For infrastructure, security, and operational detail, start with:

- [Persistence and media cutover](docs/PERSISTENCE_MEDIA_CUTOVER.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security model](security_spec.md)
- [Test and verification map](TEST_COVERAGE_AUDIT.md)

> *“Carve your own destiny. Defy the heavens. Master the infinite scroll.”* —
> **SEIHOUSE**
