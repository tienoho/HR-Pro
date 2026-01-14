## 2025-01-26 - [Critical Action Accessibility]
**Learning:** Icon-only buttons for destructive actions (Delete) were completely inaccessible (no aria-label) and unsafe (no confirmation). This pattern was prevalent in the `EmployeeManager` component.
**Action:** Always pair icon-only buttons with `aria-label` and `title` tooltip. For destructive actions, ensure a confirmation step is present, even if it's a simple `window.confirm` to start with.
