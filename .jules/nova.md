## 2026-08-13 - Add click-outside dismissal to Immersion Settings
**Learning:** Custom dropdowns, popovers, and menus in the UI should typically implement a standard `click-outside` dismissal behavior using a `useRef` and a `useEffect` observing `mousedown`/`touchstart` events.
**Action:** When creating or fixing custom popover components, look to include a `ref` on the container and bind/unbind document-level listeners to close the state if the user clicks outside.
