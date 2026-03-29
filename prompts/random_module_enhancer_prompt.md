# Random Module Enhancer Prompt

## Objective
Select exactly one random module from the LifeOS codebase and perform a comprehensive "Intelligence Enlightenment" modernization. The goal is to transform monolithic views into high-performance, component-driven architectures with premium UI/UX and smart features.

## Workflow

### 1. Discovery & Audit
- **Path Selection**: Randomly pick EXACTLY ONE module directory in `src/modules/` (excluding `_template`).
- **Complexity Analysis**: Identify monolithic files (e.g., `AdminView.tsx` > 300 lines) and complex state logic.
- **UX Audit**: Look for basic UI elements that lack "LifeOS Premium" feel—missing animations, generic colors, or low information density.
- **Intelligence Gap**: Check for missing "Smart" features like metrics sparklines, automated categorization, "Quick-Log" actions, or predictive inputs.

### 2. Architectural Refactoring
- **Component Extraction**: Break down large views into specialized sub-components (e.g., `[Module]Metrics`, `[Module]List`, `[Module]Filters`, `[Module]Card`).
- **Component Sharing**: Identify and extract generic patterns (e.g., PDF/Image viewers, specialized carousels) into shared locations like `src/components/ui/` to minimize duplication and keep the application lightweight.
- **Purity Fixes**: Move non-deterministic calculations (like `new Date()`) out of the render path and use `useMemo`/`useEffect` appropriately.
- **Type Safety**: Eliminate `any` types and ensure strict interface definitions.

### 3. Visual & UX Enhancement
- **Mindblowing UI/UX**: Transform basic interfaces into "wow" experiences with vibrant colors, glassmorphism, and dynamic depth.
- **High-Density UI**: Implement compact, information-rich layouts that minimize scrolling while maintaining clarity.
- **Mobile-First Responsiveness**: Ensure the module is perfectly usable and visually stunning on mobile devices—optimized touch targets, responsive grids, and adaptive layouts.
- **Premium Aesthetics**: Use `framer-motion` for layout transitions, Lucide React for consistent iconography, and the semantic color system (accent, success, warning, danger).
- **Micro-interactions**: Add hover effects, loading skeletons, and "Quick-Fill"/"Quick-Action" bento grids.

### 4. Verification
- **Build Quality**: Run `pnpm check` to ensure zero linting, type, or test regressions.
- **Test Enhancement**: If tests are missing or have low coverage, add or enhance Vitest tests for the module. Ensure critical user flows and complex logic are properly covered.
- **Refinement**: Verify that responsiveness is flawless across all breakpoints and that 'Zen Mode' visibility is respected.

### 5. Documentation & Submission
- **Descriptive Commits/PRs**: Write a thorough description of the changes. Enumerate specific refactors (e.g., "Extracted [X] component"), UI improvements (e.g., "Added glassmorphic cards"), and functional enhancements. Explain the *why* behind design choices.

## Design Philosophy
- **Rich Aesthetics**: Vibrant, gradient-touched, and glassmorphic where appropriate.
- **Intelligence First**: If a module has data, it should have a metric. If it has a metric, it should have a trend.
- **Zen & Flow**: Actions should be frictionless and feedback should be immediate.
