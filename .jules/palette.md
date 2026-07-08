## 2024-07-08 - Accessible Reader Controls
**Learning:** Found that custom toggle switch elements (built with `div`/`span` structures styled as toggles inside buttons) in the immersion settings lacked screen reader context since their state (`on`/`off`) was purely visual (via CSS background colors) and they were missing `aria-label`s.
**Action:** Always ensure custom interactive elements, especially toggles that rely on visual cues, are equipped with clear `aria-label` attributes or `aria-checked` properties.
