## 2024-04-18 - Accessible Custom Dropdown
**Learning:** Custom `<div>`-based dropdowns are completely inaccessible to keyboard and screen reader users by default. Adding ARIA roles (`button`, `listbox`, `option`) and keyboard event handlers (`onKeyDown` for Enter and Space) makes a huge difference for accessibility. React's `useId()` is helpful for associating labels with controls.
**Action:** Always add keyboard support (`tabIndex`, `onKeyDown`) and proper ARIA roles to custom interactive components that mimic native HTML elements.
