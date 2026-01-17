## 2025-01-26 - [Critical Action Accessibility]
**Learning:** Icon-only buttons for destructive actions (Delete) were completely inaccessible (no aria-label) and unsafe (no confirmation). This pattern was prevalent in the `EmployeeManager` component.
**Action:** Always pair icon-only buttons with `aria-label` and `title` tooltip. For destructive actions, ensure a confirmation step is present, even if it's a simple `window.confirm` to start with.

## 2025-01-26 - [Form Accessibility & Testing]
**Learning:** Found that `get_by_label` in Playwright can be ambiguous if a nested button (like a password toggle) has an `aria-label` containing the label text. Also, missing `htmlFor` attributes makes forms inaccessible and harder to target reliably.
**Action:** Always add explicit `id` and `htmlFor` to form controls. When testing, use `exact=True` for labels if substrings might match other interactive elements.
