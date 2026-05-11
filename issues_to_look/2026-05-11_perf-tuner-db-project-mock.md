# Performance Tuner: MongoDB Projection Mock Missing

## Issue
Attempted to optimize `src/app/api/ai-usage/limits/route.ts` by adding `.project({ name: 1, provider: 1, admin_api_key: 1 })` to the MongoDB `find()` query to prevent over-fetching.

## Proposed Fix
The fix was added to the route file successfully.

## Why it was held back / Failed
The test suite failed (`pnpm check` failed) with a 500 error in `src/app/api/ai-usage/limits/__tests__/route.test.ts`. This was likely because the mock implementation of MongoDB in the test environment does not support `.project()` on the cursor returned by `find()`, causing a `TypeError`.

Per the autonomous agent rules, the code change has been reverted. The test setup needs to be updated to support `.project()` in the mock before this optimization can be applied.
