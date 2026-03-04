

## Diagnosis

The "Continuar con Google" button does not respond to touch on Chrome Android, but works on desktop. After reviewing the Auth page layout, I identified **two likely causes**:

### 1. Touch events intercepted by overlay elements (most likely)
The Auth page has two absolutely positioned blur divs that cover the entire screen. The title section has `relative z-10` to appear above them, but **the Button does NOT have any z-index**, meaning the blur overlays sit on top of the button and capture touch events on mobile. Desktop mouse events behave differently and can pass through, which explains why it works on desktop but not on mobile.

### 2. Async popup/redirect blocked on mobile
On mobile browsers, popups or redirects triggered after an `await` can lose the "user gesture" context, causing the browser to silently block them. The current flow wraps the OAuth call in async/await which may break the gesture chain on Chrome Android.

## Plan

### Fix 1: Add `relative z-10` to the Button
In `src/pages/Auth.tsx`, add `relative z-10` to the Button's className so it sits above the decorative blur elements and receives touch events properly.

### Fix 2: Simplify click handler
Remove the extra async wrapper in `handleGoogleClick` and call `signInWithGoogle()` more directly, or ensure `signingIn` state doesn't interfere. Also add `touch-action: manipulation` to prevent mobile touch delays.

Both fixes are in `src/pages/Auth.tsx` only.

