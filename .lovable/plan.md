

## Problem Diagnosis

The root cause of nearly all empty analysis data is that **all calculation functions only query the personal `exercises` table**, ignoring `predefined_exercises`. Since users typically use predefined exercises in their sessions, every analysis query finds no matching exercises and returns empty results.

Specifically:
- **Exercise selector**: Only loads personal exercises (`getExercises()`), not predefined ones
- **Muscle comparisons**: Only iterates over personal exercises
- **1RM / PRs / History**: Same issue -- only query `exercises` table
- **Volume (WeeklyMuscleVolume)**: Already includes predefined exercises (correct)
- **Streak**: Works (only depends on sessions, not exercises)
- **Summary**: Works but is too basic

## Plan

### 1. Fix all calculation functions to use both exercise sources

In `src/db/calculations.ts`, update every function that queries exercises to also include predefined exercises:

- `getMuscleComparisons()` (line 92): Add `predefined_exercises` query
- `getSessionSummary()` (line 149): Look up exercise in both tables
- `getExerciseComparisons()`: Already receives exerciseId directly, works correctly
- `getExerciseHistory()`: Works correctly (uses exerciseId)
- `getPersonalRecords()` (line 234): Query both tables
- `getAll1RMs()` (line 445): Query both tables
- `get1RMHistory()`: Works correctly (uses exerciseId)
- `checkForPR()`: Works correctly (uses exerciseId)

Create a shared helper function `getAllExercisesForCalc()` that merges both tables.

### 2. Fix Exercise selector in Analysis page

In `src/pages/Analysis.tsx` (line 26/83-86): Replace `getExercises` with `getAllExercises` from `lib/api.ts` so the dropdown shows both predefined and personal exercises.

### 3. Fix 1RM panel exercise selector

In `src/components/AnalysisExtras.tsx` (OneRMPanel): The dropdown filters by `tracking_type === 'weight_reps'` but only queries personal exercises. Use `getAllExercises` instead.

### 4. Improve Streak card clarity

- Add labels to the activity grid (day-of-week labels: L, M, X, J, V, S, D)
- Add month labels above columns
- Show "days since last session" explicitly
- Add a tooltip or text explaining what each stat means
- Replace "Racha sem." with "Racha (semanas consecutivas)"

### 5. Improve Summary tab

- Show more detail per period: exercises performed, muscle breakdown, avg RPE
- Add charts (bar chart for volume over weeks/months)
- Show comparison vs previous period (delta arrows)
- Allow date range selection with a date picker

### 6. Add date range filtering across all tabs

- Add a global date range selector (preset buttons: 7d, 30d, 90d, year, custom range)
- Pass date range to all calculation functions
- Allow filtering by program when applicable

### 7. Enhance Volume tab

- Add period selector (current week, last 4 weeks, custom)
- Add explanation text: target ranges (10-20 sets/muscle/week)
- Show comparison with previous period

### Files to modify:
- `src/db/calculations.ts` -- Fix all exercise queries, add date range params
- `src/pages/Analysis.tsx` -- Use combined exercises, add date range selector, improve summary
- `src/components/AnalysisExtras.tsx` -- Fix exercise queries, enhance volume display
- `src/components/StreakCard.tsx` -- Add labels and clarity
- `src/components/ComparisonRow.tsx` -- Minor styling improvements

This is a large change. I recommend implementing it in phases, starting with the critical data fix (items 1-3) which will make all tabs functional, then improving UX (items 4-7).

