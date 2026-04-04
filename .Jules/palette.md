## 2025-01-26 - [Critical Action Accessibility]
**Learning:** Icon-only buttons for destructive actions (Delete) were completely inaccessible (no aria-label) and unsafe (no confirmation). This pattern was prevalent in the `EmployeeManager` component.
**Action:** Always pair icon-only buttons with `aria-label` and `title` tooltip. For destructive actions, ensure a confirmation step is present, even if it's a simple `window.confirm` to start with.

## 2025-01-26 - [Form Accessibility]
**Learning:** Form inputs in `Login` component were not associated with their labels, relying only on visual proximity. This makes them inaccessible to screen readers and harder to click.
**Action:** Ensure all inputs have `id`s and corresponding `<label>` elements have `htmlFor` attributes matching those `id`s.
## 2025-01-27 - [Password Visibility Toggle]
**Learning:** The login form lacked a way to verify the entered password, which can lead to login failures and frustration, especially on mobile devices or for users with motor impairments who might make typos.
**Action:** Implemented a standard "Show/Hide Password" toggle using an eye icon. This simple addition significantly improves usability and accessibility by reducing anxiety and errors during authentication.

## 2025-01-28 - [Form Validation Accessibility]
**Learning:** Login form errors were displayed visually but not programmatically linked to the inputs. Screen reader users wouldn't know which field was invalid or why. Also, required fields lacked visual indicators.
**Action:** Use `aria-invalid` on inputs and `aria-describedby` pointing to the error message ID. Visually mark required fields with an asterisk.
## 2025-01-27 - [Invisible Focusable Elements]
**Learning:** Elements hidden with `opacity-0` for hover effects (like delete buttons in lists) remain in the tab order but are invisible when focused, confusing keyboard users. Playwright also considers them "not actionable".
**Action:** Always add `focus:opacity-100` to elements that are hidden by default but reachable via keyboard, ensuring they become visible when they receive focus.

## 2025-01-29 - [Modal Form Accessibility]
**Learning:** Modals often use `div` inputs without form wrapping, making keyboard submission (Enter key) impossible and validation manual.
**Action:** Wrap modal inputs in a `<form>` element, use `htmlFor`/`id` for labels, and add `required` attributes to leverage native browser validation and improved screen reader support.
