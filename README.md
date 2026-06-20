# SEIHOUSE — Light Novels

An immersive, premium AI-powered webnovel and light novel reader inspired by WebNovel, Wuxiaworld, Qidian rankings, and dark fantasy cultivation fiction. Driven by a meaning-first engine that serves as a time capsule of creative ideas, **SEIHOUSE - Light Novels** allows readers to manifest original celestial realms, steer character fates, and read dynamically generated scrolls.

---

## 🌌 Brand Philosophy & Identity

**MISSION**: *"SEIHouse exists to make a better time capsule and translator of artistic expression. A meaning-first creator infrastructure company."*

*   **Foundation / Void & Depth** (`#000000`): The dark, ink/charcoal backdrop of infinite narrative possibilities.
*   **Signal / Clarity** (`#FAFAFA`): Pure narrative transmission read on parchment-inspired high-contrast text layers.
*   **Human / Emotional Core** (`#8B0000`): Deep crimson accents that invoke the trials, blood, and sheer passion of martial cultivation.
*   **Portal / Consciousness Signal** (`#04ACFF`): High-fidelity blue sparks representing the interface between the mortal mind and the celestial system.

### 🎭 Aesthetic Typography
*   **Emotional Headers**: *Alegreya* & *Alegreya SC* — invoking a heavy, grand, ancient-ritual visual strength.
*   **UI/System**: *Rubik* — ensuring lightweight, sharp, readable, and highly mobile-first touch navigation elements.
*   **Reading/Archive**: *Noto Serif* — tailored for long-form comfort, featuring deep line heights and rhythmic paragraph indentation.

---

## 🏛️ Core Features

### 1. The Celestial Library (Home Screen)
*   **Ascension Hero Banner**: Featuring a prominent featured cultivator showcase to immerse the user in the atmosphere of high-stakes cultivation.
*   **Realm Serial Shelves**: A beautiful bento/grid layout showing active serials with individual fantasy cover arts, genre tags, and continuous progress tracking.
*   **Destiny Manifestation**: Instantly carve a brand-new customized realm by specifying starting parameters, names, starting realms, and narrative catalysts. Data securely syncs to the Firebase Cloud.

### 2. Scroll Ledger (Novel Detail View)
*   **Grand Scroll Specs**: View high-contrast cover illustrations, full-bodied synopsis, current volume/arc name, MC cultivation progress, and total chapter count.
*   **System Action Relics**: Easily access three powerful avenues: **Start Reading**, **Open Codex**, and **Generate Next Arc** once prior volumes are finalized.
*   **Cover Forging**: Real-time generation of custom cover art using the Imagen 3 models to visually anchor the novel's essence.

### 3. Scripture Meridian Chamber (The Reader)
*   **Focus-Mode Viewport**: An ancient system interface designed for extreme legibility with deep spacing, styled blockquotes for system notifications, and elegant mobile-first margins.
*   **Chant Vocalizer (TTS)**: Fully integrated vocal synthesizer with granular speed transmission controls, custom voice engines, and play/pause functionality embedded inside the bottom overlay HUD layer.
*   **Ambient Atmospheric Audio & Narrative Cues**: Immersive background environmental sounds (Howling Wind, Heavy Rain, Temple Bells) that dynamically react to real-time metadata cues injected within the text stream.
*   **Resonance Anchors (Rich Bookmarks)**: Floating, interactive bookmarks that allow users to select paragraphs, add contemplation notes, and save timeline anchors to their memory codex.
*   **Mobile-First Controls**: Seamless left/right horizontal swipe gestures for intuitive and fast chapter navigation on touch devices.

### 4. The Infinite Codex
*   **Responsive Bottom Sheet Modal**: Fluid, spring-loaded swipe-up sheet for mobile, allowing users to consult character lore and cultivation stats without severing their current reading context.
*   **Timeline Recaps**: A chronological causal timeline detailing breakthroughs and summaries of every single chapter generated.
*   **Karma Web & Power Rankings**: Relationship webs and breakthrough tiers updated dynamically based on story progression.

### 5. Destiny Steering & Consciousness Sync
*   **Multi-Model Router**: Tailor your generation strategy by swapping between model providers and speed tiers (Google Gemini, OpenRouter, and Ollama Local Support).
*   **Predictive Destiny Suggestions**: The system examines the active `StoryWorld` memory block, calculating the most compelling paths forward (e.g., *Demonic Path*, *Sect Warfare*, *Jade Companions*).
*   **Editable Destiny Script**: Combine auto-generated paths or craft custom directives in an advanced Prompt Box before triggering the next arc injection. 
*   **Fluid Transmutation Loading**: Immersive shivering skeleton states and progress overlays keeping the user anchored while the AI synthesizes worlds in the background.

---

## 🛠️ Architecture & Optimization

### 📱 Mobile Polish & Responsiveness
*   **Compact HUD Navigation**: The scripture bottom-HUD reorganizes on mobile layout to offer a lightweight control row for TTS, rate toggle, and navigation buttons.
*   **Swipe Architecture**: Integrated touch event observers mapping to chapter traversal logic.

### 🚀 Technical Stack
*   **Frontend Ecosystem**: React 18+ with Vite, leveraging Tailwind CSS utility classes and `lucide-react` for iconography.
*   **Animations**: Staggered and spring-loaded animations via `motion/react` to deliver an organic interface flow.
*   **Backend & Cloud Services**: 
    *   Node.js Express Server proxying requests.
    *   **Firebase Authentication** & **Firestore Database** enabling multi-device sync, persistent codex states, and secure role-based rules.
*   **Generative AI Ecosystem**: Full integration with the `@google/genai` TypeScript SDK (streaming chunks and function calling) as well as broad multi-provider support.

---

*“Carve your own destiny. Defy the heavens.”* — **SEIHOUSE**
