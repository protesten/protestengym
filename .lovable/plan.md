

## Muscle Fatigue Engine & Body Heatmap

This feature adds a new "Fatiga" page with three components: a body heatmap showing per-muscle fatigue levels, a critical muscles dashboard, and a deload recommender.

### Architecture

All logic is client-side, computed from existing session/set data in the database. No schema changes needed.

### Files to create/modify

**1. `src/lib/fatigue-config.ts`** (new)
- Recovery rate map: each of the 49 muscles mapped to a recovery category (fast=50%/24h, medium=33%/24h, slow=25%/24h)
- Color thresholds: green <30%, yellow 30-60%, orange 60-85%, red >85%
- Fatigue calculation function: given sessions+sets+exercises from the last ~14 days, compute current fatigue per muscle
  - For each session: compute W = sets x reps x weight per exercise (normalized so intense session = ~40-50% fatigue)
  - Primary muscles get 100% of W, secondary get 50%
  - Apply time-decay based on hours elapsed since session using the muscle's recovery rate
  - Cap at 100%, sum across sessions

**2. `src/pages/Fatigue.tsx`** (new)
- Main page with three sections:
  - **Body Heatmap**: SVG-based front/back human body diagram with muscles as colored regions (green/yellow/orange/red based on fatigue %)
  - **Critical Muscles Dashboard**: Filtered list of muscles at orange/red level, showing name, fatigue %, and estimated recovery time
  - **Deload Recommender**: If average body fatigue >70% for 3+ consecutive days, show a banner suggesting a deload week
- Uses existing `getSessions`, `getSessionExercises`, `getSets` APIs to fetch recent training data
- Computes fatigue on mount using the engine from fatigue-config.ts

**3. `src/components/BodyHeatmap.tsx`** (new)
- SVG component with simplified front+back human silhouette
- Each muscle group region is a `<path>` element colored based on its fatigue level
- Tooltip on tap/hover showing muscle name and exact fatigue %
- Responsive, works on mobile

**4. `src/App.tsx`** (modify)
- Add route `/fatigue` pointing to the new Fatigue page

**5. `src/components/BottomNav.tsx`** (modify)
- Add "Fatiga" entry to the `moreItems` array with a Flame or Activity icon

### Fatigue Algorithm Detail

```text
For each muscle M:
  fatigue(M) = 0
  For each session S in last 14 days:
    hoursAgo = (now - S.date) / 3600000
    For each exercise E in S:
      if M in E.primary_muscles or M in E.secondary_muscles:
        W = totalSets * avgReps * avgWeight (for work sets only)
        W_normalized = min(W / referenceMax, 1.0) * 50  // cap contribution ~50%
        multiplier = M in primary ? 1.0 : 0.5
        decayRate = recoveryRate[M]  // 0.50, 0.33, or 0.25 per 24h
        remaining = W_normalized * multiplier * (1 - decayRate)^(hoursAgo/24)
        fatigue(M) += remaining
  fatigue(M) = min(fatigue(M), 100)
```

### Deload Logic

Track average fatigue across all trained muscles over last 7 days. If it exceeds 70% on 3+ days, display a prominent deload suggestion card.

### Visual Design

Follows existing app patterns: dark theme, rounded cards, `bg-card border-border` styling, uses existing Skeleton for loading states. The heatmap uses an inline SVG with anatomically grouped paths for major muscle regions.

