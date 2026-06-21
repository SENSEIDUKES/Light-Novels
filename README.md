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

```
                                  +-----------------------------+
                                  |      Scripture Reader       |
                                  | (Vocal Cues & Atmosphere)   |
                                  +--------------+--------------+
                                                 |
                                                 v
+-------------------------+       +--------------+--------------+       +------------------------+
|   Akasha Memory State   | <===> |    Causal Narrative RAG     | <===> |  Multi-Model AI Router  |
| (Daoists, Laws, Karma)  |       |  (Embeddings & Syntheses)   |       | (Gemini/OpenRouter/Local)|
+-------------------------+       +-----------------------------+       +------------------------+
```

SEIHOUSE operates on a fully integrated state loops structure. Rather than generating stateless, drifting story text, it coordinates world memory, active vector similarity indices, and character status updates.

### 1. The Alchemical Blueprinting Engine
When spawning a novel, the user feeds starting nodes (genre pathways, main character roles, catalyst starting relics) to **Agent Versa**.
*   **The Blueprint Scribe**: The backend structures a comprehensive `WorldBlueprint` containing the world backstory (`worldOverview`), main character profile (`mcProfile`), core power tiers (`powerSystemOutline`), starting factions, and deep alchemical constraints (`styleBible`).
*   **Vol I Arc Genesis**: Deconstructs the initial blueprint into an structured 10-chapter ledger (`StoryArc`). Each chapter contains predefined titles and precise structural premises designed to keep pacing cohesive before writing a single word.

### 2. Causal Retrieval-Augmented Generation (RAG) & Memory Loops
To prevent common terminal text drift and maintain perfect lore longevity over dozens of chapters:
*   **Vector Space Projection**: Within `src/lib/rag.ts` and the `/api/embed` endpoint, SEIHOUSE utilizes Google's state-of-the-art **`text-embedding-004`** model to project previous chapter summaries into high-dimensional vector representations.
*   **Cohesive Memory Context**: Before synthesizing Chapter `N`, the **Agent Scout** Queries the vector space, retrieving up to 10 contextually matched preceding elements (e.g. searching the vector space for *"Azure Cloud elder vengeance"* when generating a fight chapter, pull summaries of previous Azure Cloud elder clashes).
*   **Auto-Advancing States**: Every generated block outputs two segments: scenic story blocks and structured JSON memory updates (`memoryUpdates`). As characters die, master new techniques, or enter factions, the engine **automatically parses** and applies updates to the **Akasha Narrative Record** in real-time.

### 3. State-Synchronized Akasha Ledger
Located at `/src/components/AkashaRecord.tsx` and the core `LivingCodex.tsx`, the store tracks four active matrices:
*   📜 **Realm & Rank Status**: Shows active breakthrough tiers, current ascension metrics, and rules of engagement.
*   👥 **Daoists**: Keeps an interactive record of encountered gods, allies, and enemies. Tracks role, name, faction, alive/dead state, and unlocked elemental abilities.
*   ⚖️ **Laws**: Strict world laws outlining physical and supernatural constraints of the universe (e.g., *"Double-cultivators face absolute heavenly thunder tribulation unless protected"*). If violated, the AI incorporates the systemic backlash.
*   🌀 **Karma Bonds**: Chronologically records active storylines, open plot points, and achieved heroic deeds. Users can manually bind new karma or witness the engine seal karma threads automatically as arc chapters are read.

### 4. Destiny Steering & Model Provider Router
At the end of every 10-chapter volume, the text stream halts. The portal analyzes the accumulated database state, presenting **Predictive Destiny Directions**:
*   *Action Progression*: Launch grand tournaments, sect warfare, and young master face-slapping.
*   *Darker Path*: Triggers demonic corruptions, betrayal traps, and high-stakes survival.
*   *New Location Spatial Leaps*: Ascension to higher-tier celestial coordinates, resetting local relative power scales.
*   *Custom Directives Script*: An advanced control panel allowing users to write custom prompts, overriding or augmenting suggestions before fusing the next arc block.
*   *The Router Box*: Fully adjustable routing configuration (`routingConfig`). Swap generation processes, translation models, and cover art forgery between **Google Gemini (flash/pro)**, **OpenRouter (DeepSeek, Llama3)**, or localized hosts running **Ollama** natively.

### 5. Multi-System Illustrated Cover & Entity Forgery
*   **The Style Bible Script**: Automatically wraps design instructions with stable digital-painting attributes based on the generated realm style (Chinese light novel, gothic ink, cyberpunk celestial).
*   **Card Manifestation**: Users can click the "Forge Portrait" action on cualquier card (Characters, Beasts, Locations, Relics). The engine synthesizes custom book covers and entity paintings.
*   **Chronicle Rollbacks**: If you dislike an AI visual iteration or the character breaks through to a new form (triggering the `evolutionReady` state), SEIHOUSE preserves an image history ledger. Revert to any historical depiction easily via the chronological visual cards.

---

## 📖 Scripture Meridian Chamber (The Immersive Reader)

The primary interaction mode is styled as an ancient scriptures chamber:
*   🔊 **Narrative Ambient Audio**: Integrates environmental soundtracks (Heavy Rain, Howling Winds, Temple Bells, Bamboo Flute).
*   🎭 **Real-Time SFX Cues**: The story generator writes emotional cue markers into the blocks (such as `[SFX: Thunder]` or `[BG: Wind]`). The interface reads these cues, dynamically triggering atmospheric audio fades.
*   🗣️ **Chant Vocalizer (TTS)**: Built-in text-to-speech synthesis with a bottom overlay HUD. Regulate speeds, pause/play, and track progress during long reading sessions.
*   📖 **Bilingual Translation Gateway**: DeepL integration with a high-fidelity **Gemini fallback pipeline**. Translates chapter text into 12 major languages (Korean, Simplified Chinese, German, etc.) while matching exact custom bilingual terminology dictionaries to keep translated cultivation terms accurate!
*   🌌 **Focus Viewport & Gestures**: Mobile-first design offering total distraction-free reading, custom screen width constraints to prevent stretched text, and smooth left-or-right horizontal swiping to turn chapters on touchscreens.

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

