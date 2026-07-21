## 2024-07-08 - Accessible Reader Controls
**Learning:** Found that custom toggle switch elements (built with `div`/`span` structures styled as toggles inside buttons) in the immersion settings lacked screen reader context since their state (`on`/`off`) was purely visual (via CSS background colors) and they were missing `aria-label`s.
**Action:** Always ensure custom interactive elements, especially toggles that rely on visual cues, are equipped with clear `aria-label` attributes or `aria-checked` properties.

## 2024-07-10 - Dynamic ARIA Labels for Icon-Only Toggle Buttons
**Learning:** Icon-only toggle buttons (such as the play/pause button in `PlaybackControls`) often use dynamic visual cues and `title` attributes, but screen reader users miss out on these changes if the `aria-label` is missing or static.
**Action:** Always ensure that icon-only buttons with dynamic states have `aria-label` attributes that precisely match their visual and functional state (e.g., matching a dynamic `title`).
## 2026-07-11 - [Restoring Button State Context & Focus Accessibility]
**Learning:** The use of `disabled:pointer-events-none` on buttons is a UX trap; it prevents users from hovering and seeing native browser tooltips or custom `title` attributes explaining *why* the button is disabled. Furthermore, stripping focus with `focus:outline-none` breaks keyboard navigation unless explicitly replaced by a `focus-visible` ring.
**Action:** Always favor `disabled:cursor-not-allowed` over `pointer-events-none` for interactive elements to retain state clarity via tooltips, and ensure every `outline-none` element explicitly includes `focus-visible` styles to preserve keyboard accessibility.
## 2024-07-24 - Missing ARIA Labels on Icon Buttons
**Learning:** Many interactive icon-only buttons across the app (like `Trash2` remove buttons in editing interfaces) lack proper `aria-label` and `title` attributes. This breaks accessibility for screen reader users and reduces discoverability for sighted users who rely on hover tooltips.
**Action:** When working on form or list editing components, always check inline icon-only buttons (like delete, edit, or add buttons) for explicit accessibility text and hover hints.
## 2026-07-16 - Keyboard Focus in DestinyChoicePanel
**Learning:** Adding consistent focus-visible rings is important for keyboard navigation and improves a11y for interactive elements that are custom components (like clickable images) rather than standard links/buttons.
**Action:** Always add focus-visible styles when implementing custom clickable UI elements.

## 2025-02-12 - Ensure screen-reader accessibility for icon-only buttons

**Learning:** Found several components using icon-only buttons that relied solely on `title` attributes (or lacked descriptions altogether). While `title` gives hover text for mouse users, it is not consistently exposed to screen readers unless explicitly bound via ARIA.
**Action:** When creating or updating icon-only interactive elements (like `button` or `[role="button"]`), always explicitly assign an `aria-label` describing the action, matching the `title` attribute's intent where possible.
## 2026-07-21 - Adding Accessible ARIA Labels to Interactive Icons
**Learning:** Found that multiple interactive icon buttons lacked readable text contexts for screen reader software within repeating card layouts.
**Action:** Always include context-aware ARIA labels on dynamic icon actions so that users rely on screen readers receive descriptive input rather than unhelpful non-descript actions.
