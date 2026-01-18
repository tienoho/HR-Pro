## 2025-01-26 - [Critical Action Accessibility]
**Learning:** Icon-only buttons for destructive actions (Delete) were completely inaccessible (no aria-label) and unsafe (no confirmation). This pattern was prevalent in the `EmployeeManager` component.
**Action:** Always pair icon-only buttons with `aria-label` and `title` tooltip. For destructive actions, ensure a confirmation step is present, even if it's a simple `window.confirm` to start with.

## 2025-01-26 - [Form Accessibility]
**Learning:** Form inputs in `Login` component were not associated with their labels, relying only on visual proximity. This makes them inaccessible to screen readers and harder to click.
**Action:** Ensure all inputs have `id`s and corresponding `<label>` elements have `htmlFor` attributes matching those `id`s.
## 2025-01-27 - [Password Visibility Toggle]
**Learning:** The login form lacked a way to verify the entered password, which can lead to login failures and frustration, especially on mobile devices or for users with motor impairments who might make typos.
**Action:** Implemented a standard "Show/Hide Password" toggle using an eye icon. This simple addition significantly improves usability and accessibility by reducing anxiety and errors during authentication.
