# CLAUDE.md

Refer to [AGENTS.md](AGENTS.md) for full architecture guidance, module systems, and coding standards for this repository.

For agent prompt work:

- Start from [prompts/README.md](prompts/README.md) for the run contract.
- Read [prompts/random_selector.md](prompts/random_selector.md) for autonomous prompt execution flow.
- For random autonomous runs, update [prompts/prompts_metadata.json](prompts/prompts_metadata.json) immediately after prompt selection and again on terminal outcome; include `lastSelectedAt`, `lastCompletedAt`, `lastOutcome`, and counters in the same commit.
- If there is no safe, reviewable docs gap, create an `issues_to_look/` note and treat it as a no-op instead of inventing new policy.
- Record prompt selection and outcome in [prompts/prompts_metadata.json](prompts/prompts_metadata.json), and create `issues_to_look/` notes for safe stop/no-op runs.
