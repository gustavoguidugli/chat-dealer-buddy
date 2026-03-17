

# Plan: Deploy Updated Edge Function

## Problem
The `manage-users` edge function code was updated with the `complete_onboarding` action (handles create-or-update user via Admin API), but it was never deployed. The frontend code correctly calls it, but the deployed function doesn't have the new action — so the call either fails silently or the old version runs without the handler.

## Fix
1. **Redeploy `manage-users` Edge Function** — the code is already correct in the repo, it just needs deployment
2. **Verify** the function logs show successful `complete_onboarding` processing after deployment

No code changes needed — just deployment.

