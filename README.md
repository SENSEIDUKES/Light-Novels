# SEIHOUSE — Light Novels

An immersive, premium AI-powered webnovel and light novel reader inspired by WebNovel, Wuxiaworld, Qidian rankings, and dark fantasy cultivation fiction. Driven by a meaning-first engine that serves as a time capsule of creative ideas, **SEIHOUSE - Light Novels** allows readers to manifest original celestial realms, steer character fates, and read dynamically generated scrolls.

---

## 🌌 Brand Philosophy & Identity

At its core, **SEIHOUSE** exists to make a better time capsule and translator of artistic expression. We believe in meaning-first creator infrastructure:

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

### 3. Scripture Meridian chamber (The Reader)
*   **Focus-Mode Viewport**: An ancient system interface designed for extreme legibility with deep spacing, styled blockquotes for system notifications, and elegant mobile-first margins.
*   **Chant Vocalizer (TTS)**: Fully integrated vocal synthesizer with granular speed transmission controls, custom voice engines, and play/pause functionality embedded inside the bottom overlay HUD layer.
*   **Ambient Atmospheric Audio**: Immersive background environmental sounds (Howling Wind, Heavy Rain, Temple Bells) with a dedicated audio control widget.
*   **Mobile-First Controls**: Seamless left/right horizontal swipe gestures for intuitive and fast chapter navigation on touch devices.

### 4. The Infinite Codex
*   **Virtualized Performance**: Highly optimized list virtualization ensures butter-smooth scrolling through hundreds of timeline chapters, relationships, and artifacts without DOM lag or performance degradation.
*   **Responsive Bottom Sheet Modal**: Fluid, spring-loaded swipe-up sheet for mobile, allowing users to consult character lore and cultivation stats without severing their current reading context.
*   **Timeline Recaps**: A chronological causal timeline detailing breakthroughs and summaries of every single chapter generated.
*   **Karma Web & Power Rankings**: Relationship webs and breakthrough tiers updated dynamically based on story progression.

### 5. The Destiny Steering & Multi-Model Chamber
*   **Multi-Model Router**: Tailor your generation strategy by swapping between speed tiers (Lightning), standard storytelling (Core), or high-intelligence deep logic (Reasoning) AI modes.
*   **Predictive Destiny Suggestions**: The system examines the active `StoryWorld` memory block, calculating the most compelling paths forward (e.g., *Demonic Path*, *Sect Warfare*, *Jade Companions*).
*   **Editable Destiny Script**: Combine auto-generated paths or craft custom directives in an advanced Prompt Box before triggering the next arc injection. 

---

## 🛠️ Architecture & Optimization

### 📱 Mobile Polish & Responsiveness
*   **Compact HUD Navigation**: The scripture bottom-HUD reorganizes on mobile layout to offer a lightweight control row for TTS, rate toggle, and navigation buttons.
*   **Swipe Architecture**: Integrated touch event observers mapping to chapter traversal logic.
*   **Windowing / Virtualization**: Lists in the Codex and reader bookmarks use custom windowing functions to slice DOM renders, keeping device memory footprints tiny.

### 🚀 Technical Stack
*   **Frontend Ecosystem**: React 18+ with Vite, leveraging Tailwind CSS utility classes and `lucide-react` for iconography.
*   **Animations**: Staggered and spring-loaded animations via `motion/react` to deliver an organic interface flow.
*   **Backend & Cloud Services**: 
    *   Node.js Express Server proxying requests.
    *   **Firebase Authentication** & **Firestore Database** enabling multi-device sync, persistent codex states, and secure role-based rules.
*   **Generative AI**: Powered by Google’s latest Gemini models (integrating `gemini-2.5-flash`, `gemini-2.5-pro`, and `gemini-2.5-pro-reasoning`) via the `@google/genai` TypeScript SDK.

---

*“Carve your own destiny. Defy the heavens.”* — **SEIHOUSE**
