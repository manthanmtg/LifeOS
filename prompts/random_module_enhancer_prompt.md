# Random Module Enhancer Prompt

## Objective
Select a random module from the LifeOS codebase and perform a comprehensive "Intelligence Enlightenment" modernization. The goal is to transform monolithic views into high-performance, component-driven architectures with premium UI/UX and smart features.

## Workflow

### 1. Discovery & Audit
- **Path Selection**: Randomly pick a module directory in `src/modules/` (excluding `_template`).
- **Complexity Analysis**: Identify monolithic files (e.g., `AdminView.tsx` > 300 lines) and complex state logic.
- **UX Audit**: Look for basic UI elements that lack "LifeOS Premium" feel—missing animations, generic colors, or low information density.
- **Intelligence Gap**: Check for missing "Smart" features like metrics sparklines, automated categorization, "Quick-Log" actions, or predictive inputs.

### 2. Architectural Refactoring
- **Component Extraction**: Break down large views into specialized sub-components (e.g., `[Module]Metrics`, `[Module]List`, `[Module]Filters`, `[Module]Card`).
- **Purity Fixes**: Move non-deterministic calculations (like `new Date()`) out of the render path and use `useMemo`/`useEffect` appropriately.
- **Type Safety**: Eliminate `any` types and ensure strict interface definitions.

### 3. Visual & UX Enhancement
- **High-Density UI**: Implement compact, information-rich layouts that minimize scrolling.
- **Premium Aesthetics**: Use `framer-motion` for layout transitions, Lucide React for consistent iconography, and the semantic color system (accent, success, warning, danger).
- **Micro-interactions**: Add hover effects, loading skeletons, and "Quick-Fill"/"Quick-Action" bento grids.

### 4. Verification
- **Build Quality**: Run `pnpm check` to ensure zero linting, type, or test regressions.
- **Refinement**: Verify that responsiveness is maintained and that 'Zen Mode' visibility is respected.

## Design Philosophy
- **Rich Aesthetics**: Vibrant, gradient-touched, and glassmorphic where appropriate.
- **Intelligence First**: If a module has data, it should have a metric. If it has a metric, it should have a trend.
- **Zen & Flow**: Actions should be frictionless and feedback should be immediate.
