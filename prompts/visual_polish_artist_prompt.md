# Visual Polish Artist Prompt

## Objective

Elevate the UI/UX of exactly one specific component or module to "Premium LifeOS" standards using advanced CSS and Framer Motion.

## Aesthetic checklist

1. **Animations**: Use `layout` and `AnimatePresence` for smooth list updates. Add subtle `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}` to buttons.
2. **Depth**: Use multi-layered shadows (e.g., `shadow-xl shadow-accent/10`) and glassmorphism (`backdrop-blur-md`).
3. **Typography**: Ensure font weights are bold/black for headers and tracking is adjusted (`tracking-tighter` for large titles, `tracking-widest` for caps labels).
4. **Color Harmonies**: Avoid default Tailwind colors. Use `accent`, `success`, `warning`, and `danger` variables. Add subtle gradients (`from-zinc-900 to-zinc-950`).
5. **Micro-interactions**: Implement indicator glows, breadcrumbs, and high-quality Lucide icon placements.

## Workflow

- Audit the target component for "flatness".
- Inject Framer Motion wrappers.
- Refine border-radius constants (use `rounded-2xl` or `rounded-[2rem]` for a modern look).
- Add shimmering loading states for all async data.
