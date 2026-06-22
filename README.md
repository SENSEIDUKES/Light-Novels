# SEIHOUSE — Light Novels & Immersive Causal Narrative Engine

An immersive, premium AI-powered webnovel, light novel reader, and active translation engine inspired by **WebNovel**, **Wuxiaworld**, **Qidian rankings**, and dark fantasy cultivation fiction. Driven by a meaning-first, deep-synthesis generative model pipeline, **SEIHOUSE** serves as a modern time capsule for artistic expressions and creative narrative realms.

It empowers readers to dynamically manifest new celestial worlds, forge illustrated visual cards, program sequential destiny directions, and read dynamically generated scrolls synchronized with real-time sound cues and vocal synthesize chants.

---

## 🌌 Brand Philosophy, Color Palette & Identity

**MISSION**: *"SEIHouse exists to make a better time capsule and translator of artistic expression. A meaning-first creator infrastructure company for music and literature."*

*   🖤 **Foundation / Void & Depth** (`#000000`): The absolute canvas. Represents the infinite ink background from which narrative possibilities, ancient scripts, and cosmos are born.
*   ⬜ **Signal / Clarity** (`#FAFAFA`): Pristine transmission. Standardizes long-form comfort on parchment-feel content cards with ultimate legibility and high contrast.
*   🩸 **Human / Emotional Core** (`#8B0000`): Deep crimson accents representing spiritual trials, ancestral cores, bloodlines, breakthroughs, and the passion of mortal cultivation.
*   🌐 **Portal / Consciousness Signal** (`#04ACFF`): High-fidelity turquoise flare that anchors holographic windows, system alerts, loading transitions, and multi-model matrix gates.

### 🎭 Aesthetic Typography
To balance narrative voice with modern user interface ergonomics, SEIHOUSE utilizes a strict three-tier font system:
1.  **Emotional Headers & Grand Arc Titles**: *Alegreya* & *Alegreya SC* (Serif / Small Caps) — invoking an ancient, weight-bearing, divine-ritual scribe style with deep tracking.
2.  **UI/System Overlays & Holorails**: *Rubik* & *Rubik Oblique* (Sans-Serif) — optimizing razor-sharp readability for touch targets, numeric power levels, and settings panels.
3.  **Reading Viewport & Scripture Core**: *Noto Serif* — tailored for continuous high-contrast light-on-dark immersion with custom text line-heights, character indents, and proportional margins.

---

## 🏛️ Comprehensive Narrative Engine Architecture

SEIHOUSE operates on a fully integrated state loops structure. Rather than generating stateless, drifting story text, it coordinates world memory, active vector similarity indices, and character status updates.

- **The Alchemical Blueprinting Engine; Creates cohesive world states before writing words** | *Example: Setting up a dark fantasy realm with specific factions and main character backstories before starting chapter 1.* | **Dev: Architectures a `WorldBlueprint` state containing structured schemas (power levels, relationships) guiding the LLM prior to text generation.**

- **Causal Retrieval-Augmented Generation (RAG) & Memory Loops; Prevents AI forgetfulness by constantly retrieving past summaries** | *Example: The AI remembers an enemy from chapter 2 when they reappear in chapter 15.* | **Dev: Uses `text-embedding-004` to project chapter summaries into vector representations, retrieving matched context via similarity search for state-aware prompts.**

- **State-Synchronized Akasha Ledger; Tracks your characters, ranks, and world rules dynamically** | *Example: Checking the character's cultivation rank or reviewing who is alive or dead in a faction.* | **Dev: A React state-store parsing live JSON `memoryUpdates` emitted during block generations, mutating the `LivingCodex.tsx` matrix (Daoists, Laws, Karma) in real-time.**

- **Destiny Steering & Model Provider Router; Lets users pick the next story arc direction or swap AI models** | *Example: After 10 chapters, electing to send the main character on a dark revenge path instead of a tournament arc.* | **Dev: Halts the stream at boundaries to inject predictive prompts. Exposes `routingConfig` for seamless API switching across Gemini, OpenRouter, or Ollama.**

- **Multi-System Illustrated Cover & Entity Forgery; Generates character art that adheres to universe styles** | *Example: Forging a visual portrait of a newly introduced beast or updating the main character's look after a timeline skip.* | **Dev: Wraps user prompts with a stable background style injected into the image generation tool to ensure consistent visual aesthetics.**

---

## 📖 Scripture Meridian Chamber (The Immersive Reader)

The primary interaction mode is styled as an ancient scriptures chamber:

- **Narrative Ambient Audio; Plays environmental sounds synced with the text** | *Example: Hearing rain and thunder as a character walks into a storm.* | **Dev: Parses metadata blocks (`block.metadata.music` or `audioSignature`) via the `musicResolver` and synchronizes Web Audio hook playbacks based on scroll position.**

- **Real-Time SFX Cues & System Alerts; Displays in-text system holographic notifications** | *Example: A glowing 'Level Up' LitRPG pane rendering with turquoise animations as you reach an important paragraph.* | **Dev: Injects structured JSON `system` objects natively from the LLM directly into NDJSON chunks, rendering animated `SystemBlock` React framer-motion components over the raw text.**

- **Chant Vocalizer (TTS); Reads the story aloud** | *Example: Listening to a narrative session on the go with speed controls.* | **Dev: Integrates TTS synthesis via Web Speech API or Kokoro Voice Registry pipelines layered on the app HUD.**

- **Bilingual Translation Gateway; Translates chapters while remembering customized world terms** | *Example: Reading complex Chinese cultivation concepts perfectly translated into German.* | **Dev: Leverages a DeepL API proxy alongside a Gemini-fallback pipeline with custom terminology glossary mapping arrays.**

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

*Last updated: 06/22/26*

