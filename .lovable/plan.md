

## Problem

Two performance issues:

1. **Set updates are synchronous-blocking**: Every field change (weight, reps, RPE) on blur triggers `updateSetApi` which hits the database, then checks for PR, then invalidates all queries. The UI freezes while waiting.

2. **Analysis loading feels stuck**: All calculation functions make multiple sequential Supabase queries with no loading indicators, giving the impression the app is frozen.

## Plan

### 1. Optimistic updates for set mutations (`src/pages/SessionDetail.tsx`)

Add `onMutate` to `updateSetMutation` that immediately updates the local `allSets` query cache before the server responds. Add `onError` rollback. This makes every weight/reps/RPE change feel instant.

- Snapshot `allSets` in `onMutate`
- Optimistically merge the changed fields into the cached set
- On error, rollback to snapshot
- Move PR check to `onSuccess` instead of `mutationFn` so it doesn't block the save

Also add optimistic updates to `addSetMutation` and `deleteSetMutation` for instant feedback.

### 2. Debounce rapid field changes (`src/pages/SessionDetail.tsx`)

The `NumericInput` fires `onSave` on every blur. If a user tabs through fields quickly, this triggers many mutations. Add a small debounce (300ms) or batch updates to reduce redundant API calls.

### 3. Add loading skeletons to Analysis tabs (`src/pages/Analysis.tsx`)

Currently tabs show nothing while data loads. Add `Skeleton` placeholders during loading states for:
- Exercise history list
- Muscle volume table
- PRs cards
- Summary period cards
- Body evolution charts

Use existing `Skeleton` component from `src/components/ui/skeleton.tsx`.

### 4. Add loading states to calculation hooks (`src/pages/Analysis.tsx`)

The current pattern uses `useEffect` + `setState` for analysis data (muscle, PRs, periods). These have no loading indicator. Add `isLoading` state variables and show skeletons while data is being fetched.

### Files to modify:
- **`src/pages/SessionDetail.tsx`**: Optimistic updates on set mutations, debounce inputs
- **`src/pages/Analysis.tsx`**: Loading states + skeleton placeholders for all tabs
- **`src/components/AnalysisExtras.tsx`**: Loading skeletons for Volume and 1RM panels

