# Mobile Responsiveness and Tap Fix Report

## Summary
- Issue: On mobile, buttons and links felt unresponsive or did not trigger actions reliably.
- Root cause: A global `touchend` handler in `static/js/main.js` prevented default behavior on all taps and re-triggered clicks in a way that could suppress native link navigation or cause double-handling. In addition, touch listeners were not declared passive, which can hurt responsiveness, and there was no `touch-action` hint for removing the 300ms delay in some browsers.
- Fix: Adjusted touch handling to be safe, synthesized a single reliable click for interactive elements, made touch listeners passive where appropriate, and added CSS `touch-action: manipulation` for tappable controls.

## Details

### What was wrong
- File: `scenes_project/scenes_app/static/js/main.js`
  - The code attached a document-level `touchend` listener:
    - It called `e.preventDefault()` for any tap on `button, a, .touch-target`.
    - Then it triggered `button.click()` later. This can conflict with native navigation and some in-flight handlers; also may lead to double activations depending on the browser's synthetic click timing.
  - `touchstart`/`touchend` listeners were not declared as passive. On mobile browsers, non-passive listeners on scrollable containers can delay scrolling/tap processing.

- CSS did not provide `touch-action` hints so some devices retained delay heuristics.

### Changes made
1. main.js: make touchstart and touchend listeners passive where safe
   - `touchstart` now uses `{ passive: true }` for visual feedback only.
   - The UI reset `touchend` listener now uses `{ passive: true }`.

2. main.js: fix the global `touchend` prevention/retap logic
   - Replaced the block to:
     - Ignore disabled/aria-disabled elements.
     - Call `e.preventDefault()` to suppress the browser's synthetic click and avoid double activation.
     - Immediately call `button.click()` to ensure default actions (including link navigation) occur reliably.
   - Kept the listener `{ passive: false }` here because we intentionally call `preventDefault()`.

3. CSS: add touch-action hints
   - File: `scenes_project/scenes_app/static/css/mobile-responsive.css`
   - Appended at end of file:
     ```css
     /* Improve touch behavior and avoid 300ms delay without disabling zoom */
     @media (max-width: 768px) {
       a, button, .touch-target {
         touch-action: manipulation;
       }
     }
     ```

### Files touched
- `scenes_project/scenes_app/static/js/main.js`
- `scenes_project/scenes_app/static/css/mobile-responsive.css`

### How to test
- On a real mobile device or mobile emulator:
  - Open any page with tappable buttons/links (e.g., header menu, favorites button, pagination).
  - Verify taps trigger immediately and exactly once.
  - Verify link navigation occurs when tapping anchors in the mobile menu and elsewhere.
  - Favorites button:
    - Tap once: count/badge updates, toast shows.
    - Tap again: toggles back, toast shows.
  - Mobile menu:
    - Tap hamburger to open; tap a menu item navigates and closes menu.
  - Scrollable areas (scene prompt, lists): assure scrolling remains smooth; no jank or blocked scrolls.

### Notes and considerations
- The global `touchend` handler exists to avoid double-tap zoom issues and provide consistent click behavior. Our update prevents default only for clear interactive targets and then triggers a single `click()`; this preserves navigation and suppresses double activation.
- If you prefer to scope this behavior more narrowly, we can limit the selector to elements having a specific class (e.g., `.touch-target`) instead of all `button, a`.
- If any particular component has its own touch logic, we should test it for conflicts. I did not see other site-wide `touchend` preventions.

### Future hardening (optional)
- Consider adding a utility class `.no-fastclick-polyfill` for regions where mobile browsers already have no 300ms delay; then remove the global `touchend` polyfill entirely.
- Add E2E tests (Playwright) for tap interactions on mobile viewport sizes.

