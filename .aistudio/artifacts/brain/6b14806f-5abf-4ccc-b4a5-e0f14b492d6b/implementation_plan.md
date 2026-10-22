# Implementation Plan: Mobile & Tablet View Optimization for Start Button

Ensure the Start button and Start Menu work smoothly, responsively, and cleanly on all mobile phones and tablets while retaining the desktop-style bottom-left taskbar placement.

## Proposed Changes

### 1. `src/components/WindowsTaskbar.tsx`
- **Start Button Touch & Sizing:**
  - Add `shrink-0` to the Start button so it never gets crushed on small screens.
  - Ensure minimum touch target size meets mobile UX standards (`h-9 px-3 sm:px-3.5`).
- **Responsive Start Menu Popup:**
  - Update positioning from fixed `w-80 sm:w-96` to `left-2 right-2 sm:right-auto sm:left-3 w-auto sm:w-96 max-w-[calc(100vw-1rem)]` so it naturally centers and fits mobile screens from 320px up to tablets without overflowing.
  - Set `max-h-[80vh] sm:max-h-[75vh]` with smooth momentum touch scrolling (`-webkit-overflow-scrolling: touch`).
- **Mobile Backdrop Overlay:**
  - Add a lightweight transparent tap-to-dismiss overlay when the Start Menu is open so mobile users can tap anywhere outside to close the menu immediately.
- **Taskbar Horizontal Space Optimization:**
  - Prevent open window tabs from pushing or squeezing the Start button or System clock on mobile.
  - Set running windows container to `flex-1 overflow-x-auto min-w-0 custom-scrollbar`.

## Verification Plan
1. Test mobile viewport dimensions (360px, 390px, 768px tablet, 1024px desktop).
2. Verify Start button stays pinned to bottom-left on both mobile and tablet.
3. Verify Start Menu opens without horizontal overflow or clipping on small devices.
4. Run `compile_applet` to confirm zero compilation errors.
