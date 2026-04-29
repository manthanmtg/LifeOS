# Crop History Widget Contract Gap

The `src/modules/crop-history/Widget.tsx` currently fetches the full `crop_history` collection from `/api/content?module_type=crop_history` and performs complex calculations (via `FormulaEngine`) in the client.

This violates the Widget Contract:
1. **Data Fetching**: It should hit `/api/widgets/summary` instead of pulling the entire DB collection.
2. **Complexity**: Dashboard widgets should be lightweight summary cards.

Refactoring the `FormulaEngine` logic to the backend summary route is a large task and requires careful migration to ensure the dashboard remains fast.
