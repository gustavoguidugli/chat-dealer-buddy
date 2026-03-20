

# Plan: Items 2B and 2C — Realtime Stability

## Item 2B — Convert mutable `let` to `useRef` in `useLeadRealtime.ts`

**File**: `src/hooks/useLeadRealtime.ts`

Changes:
1. Add `useRef` to the import (line 1)
2. Move `contatoGeralId` and `contatoWhatsapp` out of the `useEffect` and declare as `useRef` at hook level (before the useEffect)
3. Replace every read/write of these variables with `.current` (~12 occurrences across lines 34, 68-69, 73, 140-141, 214-216, 329, 331, 333, 337-339, 355-356, 372-373)

No logic changes — purely mechanical substitution.

---

## Item 2C — Optimize `enrichLeads` in `CrmFunil.tsx`

**Current problem**: `useFunilRealtime` exposes `etiquetaVersion` and `atividadeVersion` (simple counters). Every bump triggers the `useEffect` at line 165 in `CrmFunil.tsx`, which re-fetches etiquetas and atividades for ALL leads.

**Solution** (two-part):

### Part 1: Modify `useFunilRealtime.ts` to expose changed lead ID

Instead of just incrementing a version counter, capture the `id_lead` from the realtime payload and expose it:

- Change `etiquetaVersion` to `lastEtiquetaChange: { version: number, leadId: number | null }`
- Change `atividadeVersion` to `lastAtividadeChange: { version: number, leadId: number | null }`
- In the etiqueta channel callback, read `(payload.new as any)?.id_lead` and store it
- In the atividade channel callback, read `(payload.new as any)?.id_lead` and store it
- For DELETE events where `payload.new` is empty, set `leadId: null` (triggers full refresh as fallback)

### Part 2: Modify `CrmFunil.tsx` enrichment logic

- Add an `enrichSingleLead(leadId)` function that fetches etiquetas and atividades for just one lead
- In the `useEffect` (line 165), check if the change came from a single known lead ID:
  - If yes: enrich only that lead and merge into existing state
  - If no (null leadId or initial load): run the current full `enrichLeads`
- Keep `mapLeads` unchanged

### Technical detail — `CrmFunil.tsx` useEffect dependency update

```typescript
// Before
}, [realtimeLeads, realtimeWonLeads, realtimeLostLeads, reloadKey, etiquetaVersion, atividadeVersion, proprietarios]);

// After
}, [realtimeLeads, realtimeWonLeads, realtimeLostLeads, reloadKey, lastEtiquetaChange, lastAtividadeChange, proprietarios]);
```

The single-lead path will update only the matching lead across `setEnrichedLeads`, `setEnrichedWonLeads`, and `setEnrichedLostLeads` using `.map()`.

---

## Execution

Item 2B first. Wait for confirmation. Then item 2C.

