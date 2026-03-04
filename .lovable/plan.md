

## Diagnosis

The session detail page already fetches previous session data via `getPreviousSetsForExercise` and passes `prevSet` to each `SetRow`. However, the previous data only appears as tiny hints below each input field (line 77-80, shown as `hint` prop). This is easy to miss and doesn't give a clear picture of the previous workout.

## Plan

### 1. Add a "Previous Session" summary block per exercise

Above the current sets in each exercise accordion, display a compact reference card showing the previous session's data for that exercise:

- **Header**: "Sesión anterior: [date]" with a subtle background
- **Table/rows**: Each previous set shown as a read-only row with weight, reps, RPE, set type
- Style: muted/ghost appearance to distinguish from current editable sets

This will be a new component `PreviousSessionReference` rendered inside the `AccordionContent`, before the current sets.

### 2. Enhance `getPreviousSetsForExercise` to also return the session date

Modify the API function to return `{ sets: WorkoutSet[], date: string | null }` so we can display when the previous session occurred.

### 3. Update the prevSetsMap query

Store both sets and date per exercise in the map: `Map<string, { sets: WorkoutSet[], date: string | null }>`.

### Files to modify:
- **`src/lib/api.ts`**: Update `getPreviousSetsForExercise` return type to include session date
- **`src/pages/SessionDetail.tsx`**: Add `PreviousSessionReference` component, update prevSetsMap usage, render the reference block per exercise

