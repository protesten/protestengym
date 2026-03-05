

## Fix: YouTube video links blocked on desktop

### Problem
When clicking the video icon (🔗) in the exercise list, the app opens the raw URL (e.g. `youtu.be/wjvPjjPXcvw`). YouTube's `youtu.be` short URLs return `ERR_BLOCKED_BY_RESPONSE` when opened from an embedded context or certain referrers on desktop. Mobile browsers handle the redirect differently, so it works there.

### Solution

**`src/components/VideoPreview.tsx`** — Add a helper that normalizes YouTube URLs to the canonical `https://www.youtube.com/watch?v=ID` format:

- If the URL is `youtu.be/xxx` or any YouTube variant → convert to `https://www.youtube.com/watch?v=xxx`
- Use this normalized URL for the external link (`<a>` tag)
- The iframe already uses the embed URL, so no change needed there

**`src/pages/Exercises.tsx`** — Update the video icon `<a>` tag to also use the normalized URL instead of the raw `video_url`.

### Changes

| File | Action |
|---|---|
| `src/components/VideoPreview.tsx` | Export `normalizeYouTubeUrl` helper + use it in the fallback link |
| `src/pages/Exercises.tsx` | Import and use `normalizeYouTubeUrl` for the video icon link |

This is a small, focused fix — 2 files, ~10 lines changed.

