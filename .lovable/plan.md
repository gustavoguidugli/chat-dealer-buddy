

# Fix: Duplicate Leads on Creation

## Root Cause

Double insertion into state:
1. `handleNewDeal` in `CrmFunil.tsx` (line 276) adds the lead to `leads` state immediately
2. The realtime INSERT handler in `useFunilRealtime.ts` (line 88) receives the Postgres event and adds it again

When moved to another stage, the UPDATE handler removes all instances first (`filter`) then adds one back, which "fixes" the duplicate.

## Solution

In `useFunilRealtime.ts`, on INSERT, check if the lead already exists in state before adding. Change line 88 from:
```ts
setLeads((prev) => [...prev, enriched])
```
to:
```ts
setLeads((prev) =>
  prev.some(l => l.id === enriched.id)
    ? prev.map(l => l.id === enriched.id ? enriched : l)
    : [...prev, enriched]
)
```

This is a one-line change in `useFunilRealtime.ts`. The same dedup pattern is already used in the UPDATE handler (line 103). No other files need changes.

