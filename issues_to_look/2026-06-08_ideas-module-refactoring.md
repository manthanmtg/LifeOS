# Ideas Module Refactoring Recommendation

## Issue
The `src/modules/ideas/AdminView.tsx` file has grown to over 850 lines. While it successfully delegates most of its rendering to well-defined sub-components (like `IdeaFormPanel`, `IdeaKanban`, `IdeaDetailsModal`), it remains a monolithic container for all the state and business logic related to fetching, creating, updating, deleting, and reordering ideas.

## Recommendation
Extract the state and logic into custom hooks to improve the maintainability and readability of the `AdminView`. 

Suggested refactor:
1. Create a `useIdeaBoard` hook in `src/modules/ideas/hooks/useIdeaBoard.ts` to encapsulate `ideas`, `loading`, `fetchIdeas`, `handleReorder`, `handleDelete`, `handleUndoDelete`, and `handlePromote`.
2. Create a `useIdeaForm` hook to encapsulate the massive form state (`title`, `description`, `notes`, `category`, `status`, `priority`, `tagsInput`) and submission logic.
3. Separate the Drag-and-Drop boilerplate into `useIdeaDragAndDrop`.

## Reason for No-Op
The `random_module_enhancer_prompt` explicitly restricts autonomous runs from making changes that exceed approximately 100 lines of diff. Extracting the aforementioned hooks would touch over 700 lines of code, violating the scope guardrail. The rest of the module's types, UI, and functionality are otherwise in excellent shape.
