# SEIHOUSE — Light Novels & Immersive Causal Narrative Engine

An immersive, premium AI-powered webnovel, light novel reader, and active translation engine inspired by **WebNovel**, **Wuxiaworld**, **Qidian rankings**, and dark fantasy cultivation fiction. Driven by a meaning-first, deep-synthesis generative model pipeline, **SEIHOUSE** serves as a modern time capsule for artistic expressions and creative narrative realms.

It empowers readers to dynamically manifest new celestial worlds, forge illustrated visual cards, program sequential destiny directions, and read dynamically generated scrolls synchronized with real-time sound cues, vocal synthesize chants, and immersive progression systems.

---

## 🌌 Brand Philosophy, Color Palette & Identity

**MISSION**: *"SEIHouse exists to make a better time capsule and translator of artistic expression. A meaning-first creator infrastructure company for music and narrative fiction."*

*   🖤 **Foundation / Void & Depth** (`#000000`): The absolute canvas. Represents the infinite ink background from which narrative possibilities, ancient scripts, and cosmos are born.
*   ⬜ **Signal / Clarity** (`#FAFAFA`): Pristine transmission. Standardizes long-form comfort on parchment-feel content cards with ultimate legibility and high contrast.
*   🩸 **Human / Emotional Core** (`#8B0000`): Deep crimson accents representing spiritual trials, ancestral cores, bloodlines, breakthroughs, and the passion of mortal cultivation.
*   🌐 **Portal / Consciousness Signal** (`#04ACFF`): High-fidelity turquoise flare that anchors holographic windows, system alerts, loading transitions, and multi-model matrix gates.

### 🎭 Aesthetic Typography
To balance narrative voice with modern user interface ergonomics, SEIHOUSE utilizes a strict three-tier font system:
1.  **Emotional Headers & Grand Arc Titles**: *Alegreya* & *Alegreya SC* (Weight 500-700) — invoking an ancient, weight-bearing, divine-ritual scribe style with deep tracking.
2.  **UI/System Overlays & Holorails**: *Rubik* & *Rubik Oblique* (Weight 300-500) — optimizing razor-sharp readability for touch targets, numeric power levels, and settings panels.
3.  **Reading Viewport & Scripture Core**: *Noto Serif* (Weight 200-400) — tailored for continuous high-contrast light-on-dark immersion with custom text line-heights, character indents, and proportional margins.

---

## 🏛️ Comprehensive Narrative Engine Architecture

SEIHOUSE operates on a fully integrated state loops structure. Rather than generating stateless, drifting story text, it coordinates world memory, active vector similarity indices, and character status updates.

- **The Alchemical Blueprinting Engine**: Creates cohesive world states before writing words. Architectures a `WorldBlueprint` state containing structured schemas (power levels, relationships) guiding the LLM prior to text generation.
- **Causal Retrieval-Augmented Generation (RAG) & Memory Loops**: Prevents AI forgetfulness by constantly retrieving past summaries. Uses `text-embedding-004` to project chapter summaries into vector representations, retrieving matched context via similarity search for state-aware prompts.
- **State-Synchronized Akasha Ledger**: Tracks your characters, ranks, and world rules dynamically. A React state-store parsing live JSON `memoryUpdates` emitted during block generations, mutating the `LivingCodex.tsx` matrix (Daoists, Laws, Karma) in real-time.
- **Destiny Steering & Model Provider Router**: Halts the stream at boundaries to inject predictive prompts. Exposes `routingConfig` for seamless API switching across Gemini, OpenRouter, or Ollama to let users pick the next story arc direction or swap AI models.
- **Picture Manifestations (Entity Forgery)**: Generates highly consistent visual art for your world. The system wraps user prompts with stable background styles and seeds into image generation tools to forge 'Manifested' character portraits, mythical beast visualizations, and sect locations, ensuring visual aesthetics adhere perfectly to your custom universe.

---

## 📖 Scripture Meridian Chamber (The Immersive Reader)

The primary interaction mode is styled as an ancient scriptures chamber:

- **Narrative Ambient Audio**: Plays environmental sounds synced with the text via `audioSignature` triggers.
- **Immersive Game-Like System Prompts & Alerts**: Displays LitRPG-style in-text holographic notifications natively injected from the LLM. It renders animated Framer Motion components over the raw text for stat screens, level-ups, or sudden destiny shifts.
- **Semantic Entity Color Highlighting**: An adaptive color system that parses codex terms and dynamically highlights words in the reading viewport based on entity type (e.g., green for allies, deep red for enemies, violet for lovers, gold for legendary items) using targeted CSS classes.
- **Triple-Cast Chant Vocalizer (Web API TTS) & Active Text Highlighting**: A dynamic three-voice Web Speech TTS casting system. The narrator reads the prose, a dedicated MC voice speaks the protagonist's dialogue, and a distinct side-character voice covers all other interactions (rivals, love interests, masters). It parses paragraph speaker metadata in real-time to split text blocks into distinct character chunks. Additionally, the reader features active **TTS Highlighting** that syncs and highlights the exact sentence or phrase currently being narrated.
- **Bilingual Translation Gateway**: A highly robust, multi-layer translation pipeline. It primarily leverages a DeepL API proxy alongside custom context-aware terminology glossaries to enforce strict, accurate translations of niche world-building or cultivation terms. It also features an automatic fallback to an LLM-based translation agent (e.g., Gemini) ensuring uninterrupted multilingual reading across all deployed languages.

---

## ⚔️ Immersive Progression & Economy (The Dao Ranks)

SEIHOUSE features a deep meta-progression system that turns reading into an RPG-like experience.

- **The Dao Ranks**: Users ascend through 9 distinct ranks, from *Mortal Reader* to *Dao Master*, simply by reading chapters, generating worlds, and maintaining reading streaks.
- **Aura Visualizer**: As users rank up, they unlock profile aesthetics, ranging from the 'Sect Entrance Aura' to the 'Transcendental Master Matrix' (animated gradient CSS text styling).
- **Multi-Dimensional Qi Economy**: 
  - **Dao XP / Heavenly Qi**: Standard progression gained through positive interaction.
  - **Demonic Qi**: Generated passively if the user falls under specific cursed or demonic status effects (e.g., 'Demonic Corruption' or 'Curse of the Cursed Tome').
  - **Sect Qi**: Experience aligned with multiplayer and faction contributions.

---

## 🔮 Active Loot Drop System (Cosmic Artifacts)

Reading directly yields tangible, persistent account-wide rewards. 
The internal `dropEngine` parses dynamic events embedded within the AI's generated chapter text to spawn loot:

- **Karmic Tokens**: Looted when the AI generates a significant character encounter.
- **Beast Cores**: Forged when a mythical beast is defeated or tamed in the story text.
- **Fatebreaker Talismans & Calamity Shards**: Rewarded when the reader uses Destiny Steering to avert doom or when they plunge their character into cursed timelines.

---

## 🛡️ Cloud Persistence, Sects, & Security

- **Sect Alignments**: Fully functional `SectsScreen` allows users to join multiplayer factions, pooling their Sect Qi and competing on leaderboards.
- **Celestial Library Synchronization**: PostgreSQL/Data Connect stores structured account, story, chapter, codex, glossary, and seed state. IndexedDB is a disposable offline cache with a durable mutation outbox, and conflict-safe reconciliation restores libraries across devices.
- **Telemetry-Derived Encryption (BYOK)**: A local-first client obfuscation mechanism derives a client-side AES-GCM key by hashing local device telemetry. It provides "Bring-Your-Own-Key" shoulder-surfing protection for API keys directly in the browser's `secureStorage`.
- **Authenticated Ownership Boundaries**: Firebase Authentication identifies the caller; trusted server routes enforce ownership before Data Connect mutations, while permanent generated media is stored in Cloudflare R2 with PostgreSQL metadata.

---

## 🚀 Setup & Local Execution

### 📋 Prerequisites & Key Integration
Configure API keys inside `.env` or in the in-app **Secrets Settings Panel**:
*   `GEMINI_API_KEY`: Powering vector embeddings and default narrative/visual streams.
*   `OPENROUTER_API_KEY` (Optional): Bridging secondary models.
*   `DEEPL_AUTH_KEY` (Optional): Powering instant translation glossaries.

Create `.env` using `.env.example` as a template:
```env
GEMINI_API_KEY=your_key_here
OPENROUTER_API_KEY=
DEEPL_AUTH_KEY=
```

### 💻 Local Run
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start development server** (Runs multi-model backend server combined with Vite on port `3000`):
    ```bash
    npm run dev
    ```
3.  **Build production package**:
    ```bash
    npm run build
    ```
4.  **Execute production server**:
    ```bash
    npm run start
    ```

---

*“Carve your own destiny. Defy the heavens. Master the infinite scroll.”* — **SEIHOUSE**

*Began on: 06/22/2026* | *Last updated: 07/06/2026*
