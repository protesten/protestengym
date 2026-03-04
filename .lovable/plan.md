

## Problem

When sets are loaded for a session, they appear in random/inconsistent order because `getSetsBySession()` fetches all sets without any sorting (`.order()` is missing). The individual `getSets()` function correctly uses `.order('created_at')`, but the bulk function used by `SessionDetail` does not.

Additionally, the client-side `getSets` helper on line 251 filters sets from the unordered array, preserving the random order.

## Fix

**`src/lib/api.ts`** — Add `.order('created_at')` to the `getSetsBySession` query (line 215):
```
.in('session_exercise_id', seIds).order('created_at')
```

This single-line fix ensures sets always display in creation order, which matches the user's expectation that new sets appear at the bottom.

