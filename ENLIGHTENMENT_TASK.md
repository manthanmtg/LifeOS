# Task: Intelligence Enlightenment — Health Module (Complete & PR)

## Context
Partial work exists:
- `src/modules/health/components/` has: HealthCard.tsx, HealthFilters.tsx, HealthMetrics.tsx, types.ts
- `src/modules/maintenance/components/` has: types.ts (ignore this for now)
- `src/modules/health/AdminView.tsx` is still the original monolith (~3715 lines, untouched)

## Your Job
1. Review the partial components in health/components/
2. Complete/improve them as needed
3. **Refactor AdminView.tsx** to use those sub-components — this is the main work
4. Run pnpm check, fix errors
5. Create a PR

## Detailed Steps

### Refactor AdminView.tsx
- Extract logic/state into the sub-components
- Import HealthMetrics, HealthFilters, HealthCard, etc.
- Move new Date() / non-deterministic calls out of render
- useMemo/useCallback for expensive computations
- Zero `any` types

### Premium UI (in the components)
- framer-motion for transitions (AnimatePresence, motion.div)
- Lucide React icons
- CSS vars: --color-accent, --color-success, --color-warning, --color-danger
- Glassmorphic cards, subtle gradients
- Hover effects, loading skeletons
- Mobile + desktop responsive, Zen Mode respected

### Verification
```bash
pnpm check
```
Fix ALL errors/type issues before proceeding.

### Git & PR — DO NOT SKIP
```bash
git checkout main
git checkout -b feat/enlighten-health
git add -A
git commit -m "enlighten(health): component-driven architecture with premium UI"
git push origin feat/enlighten-health
gh pr create --title "enlighten(health): Intelligence Enlightenment modernization" --body "## Intelligence Enlightenment — Health Module

- 🧩 Component extraction into components/ subdirectory
- 📊 Smart metrics with trends and sparklines  
- 🎨 Premium UI: framer-motion, Lucide icons, glassmorphism, semantic colors
- ⚡ Performance: useMemo/useCallback, pure render paths
- 🔒 Type safety: eliminated any types, strict interfaces
- 📱 Full responsive: mobile + desktop, Zen Mode respected" --base main
```

After gh pr create prints the PR URL, output it clearly, then delete ENLIGHTENMENT_TASK.md and run_enlighten.sh.
