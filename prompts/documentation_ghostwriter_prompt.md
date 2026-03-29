# Documentation Ghostwriter Prompt

## Objective

Automatically generate, update, and refine documentation for LifeOS modules, core components, and API architectures to ensure they are always in sync with the implementation.

## Workflow

### 1. Context Collection

- **File Analysis**: Scan the target module or component directory for `README.md`, `AdminView.tsx`, `Widget.tsx`, and `PublicView.tsx`.
- **API Inspection**: Check `src/lib/schemas.ts` and `src/registry.ts` for data structures and registration details.
- **Deltas**: Identify recent code changes that are not yet reflected in the documentation.

### 2. Documentation Generation

- **Module READMEs**: Create or update per-module `README.md` files including:
  - **Overview**: What the module does.
  - **Data Schema**: Key fields in the `payload` as defined by Zod.
  - **Features**: List of metrics, actions, and "Smart" capabilities.
- **Architecture Updates**: Update global docs like `AGENT.md` if new patterns or core utilities are introduced.
- **Example Usage**: Provide clear, copy-pasteable examples for component usage or API interaction.

### 3. Style & Tone

- **Clarity**: Use active voice and concise technical language.
- **Information Density**: Use tables, lists, and Mermaid diagrams where they improve scannability.
- **Consistency**: Maintain the "LifeOS" terminology (e.g., "Discriminator Pattern", "Bento Grid", "Zen Mode").

### 4. Verification

- **Link Check**: Ensure all file links and cross-references are valid.
- **Accuracy**: Double-check that types and descriptions match the actual code.
