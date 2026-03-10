

## Problem: Field Name Mismatch Breaks Onboarding

The `validar_convite` database function returns a column called **`id`** (the convite UUID), but the `ConviteData` interface in `Onboarding.tsx` maps it as **`convite_id`**.

This means `conviteData.convite_id` is always `undefined`, which causes `aceitar_convite` to fail silently or throw an error — blocking the entire onboarding completion.

## Fix

**File: `src/pages/Onboarding.tsx`**

1. Update the `ConviteData` interface: rename `convite_id` to `id` to match the RPC return columns (`valido`, `empresa_id`, `id`, `erro`, `email_destino`, `role`).

2. Update all references from `conviteData.convite_id` to `conviteData.id` (used in `aceitar_convite`, convite status update, and audit log).

No database changes needed — this is purely a frontend mapping fix.

