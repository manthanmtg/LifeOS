# Documentation Ghostwriter Prompt

## Objective

Pick **one random module or core directory** and ensure its documentation is accurate and complete. One module per run — documentation improves incrementally over time.

## No-Op Protocol

- If the target already has an accurate, up-to-date `README.md` that matches the current code, **stop** — no-op.
- If updating docs would require understanding a complex feature you're unsure about, log it to `issues_to_look/` with a note on what's unclear.

## Workflow

### 1. Context Collection

- Pick a random module from `src/modules/` or a core directory (`src/lib/`, `src/components/`).
- **File Analysis**: Scan the directory for `README.md`, `AdminView.tsx`, `Widget.tsx`, and `PublicView.tsx`.
- **API Inspection**: Check `src/lib/schemas.ts` and `src/registry.ts` for data structures and registration details.
- **Deltas**: Identify recent code changes that are not yet reflected in the documentation.

### 2. Documentation Generation

- **Module READMEs**: Create or update per-module `README.md` files including:
  - **Overview**: What the module does.
  - **Data Schema**: Key fields in the `payload` as defined by Zod.
  - **Features**: List of metrics, actions, and "Smart" capabilities.
- **Architecture Updates**: Update global docs like `AGENTS.md` if new patterns or core utilities are introduced.
- **Example Usage**: Provide clear, copy-pasteable examples for component usage or API interaction.

### 3. Style & Tone

- **Clarity**: Use active voice and concise technical language.
- **Information Density**: Use tables, lists, and Mermaid diagrams where they improve scannability.
- **Consistency**: Maintain the "LifeOS" terminology (e.g., "Discriminator Pattern", "Bento Grid", "Zen Mode").

### 4. Verification

- **Link Check**: Ensure all file links and cross-references are valid.
- **Accuracy**: Double-check that types and descriptions match the actual code.

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
