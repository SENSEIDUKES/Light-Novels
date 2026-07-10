## 2024-07-08 - Accessible Reader Controls
**Learning:** Found that custom toggle switch elements (built with `div`/`span` structures styled as toggles inside buttons) in the immersion settings lacked screen reader context since their state (`on`/`off`) was purely visual (via CSS background colors) and they were missing `aria-label`s.
**Action:** Always ensure custom interactive elements, especially toggles that rely on visual cues, are equipped with clear `aria-label` attributes or `aria-checked` properties.

## 2024-07-10 - Dynamic ARIA Labels for Icon-Only Toggle Buttons
**Learning:** Icon-only toggle buttons (such as the play/pause button in `PlaybackControls`) often use dynamic visual cues and `title` attributes, but screen reader users miss out on these changes if the `aria-label` is missing or static.
**Action:** Always ensure that icon-only buttons with dynamic states have `aria-label` attributes that precisely match their visual and functional state (e.g., matching a dynamic `title`).
