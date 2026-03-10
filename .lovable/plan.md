

## Fix: Program day tracking logic in TodayRoutineSuggestion

### Problem
The component uses `currentWeek = floor(daysSinceStart / 7) + 1` to pick which training day to show. But `program_weeks.week_number` represents sequential **training days** (1, 2, 3, 4), not calendar weeks. So yesterday (day 0 diff) and today (day 1 diff) both produce `currentWeek = 1`, showing day 1 forever until a full calendar week passes.

### Solution
Replace the calendar-week calculation with a **completion-based approach**:

1. Fetch all `program_weeks` for the active program, ordered by `week_number` and `order_index`
2. Fetch all completed sessions since the program's `start_date` whose `routine_id` matches any program routine
3. For each training day, check if ALL its routines have been completed in any past session (not just today)
4. The current training day = first day where not all routines are completed
5. If all days are done, show "all completed"

This correctly advances the day whenever the user finishes all routines for that day, regardless of calendar time.

### File changed
`src/components/TodayRoutineSuggestion.tsx` — rewrite the `queryFn` logic:
- Remove `diffDays / 7` calculation
- Query completed sessions since `start_date` with matching routine IDs
- Walk through training days in order, find the first incomplete one
- Filter out routines already completed **today** (to handle partial completion within a day)
- Show pending routines for that training day

### Edge cases handled
- Multiple routines per day (e.g., "Calentamiento + Bloque2-Piernas1" on day 1): both must be completed to advance
- Same routine assigned to multiple days: match by counting completions vs occurrences
- Program not started yet (start_date in future): show nothing
- All days completed: show celebration message

