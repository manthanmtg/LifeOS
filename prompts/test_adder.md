# Test Adder Prompt

## Objective

Pick **one untested or undertested file** and add **5–15 focused Vitest tests** to improve coverage incrementally. Coverage grows over many runs, not in one massive batch.

## Workflow

### 1. Find a Gap

- **Module Scan**: Identify one module or file with missing `__tests__` or low coverage.
- **Priority**: `src/lib/` utilities → `src/app/api/` routes → complex `AdminView` logic → `src/components/`.
- Pick **one file only** per run.

### 2. Write Tests (5–15 Cases)

- **Vitest Suite**: Generate a focused `describe` block for the target file.
- **Coverage**: Cover happy paths, edge cases, and error handling.
- **Mocking Strategy**: Use `vi.mock` for external dependencies like `MongoClient`, `jose`, or `next/navigation`.
- **Edge Cases**: Include tests for invalid inputs, missing cookies, network timeouts, and Zod validation failures.

### 3. Implementation Patterns

- **Shared Fixtures**: Use centralized test data from a `tests/fixtures` directory if available, or define robust local constants.
- **Asynchronous Testing**: Use `waitFor` or `findBy` for components that fetch data.
- **Polymorphic Data**: Add tests for various `module_type` scenarios in the `content` collection.

### 4. No-Op Protocol

- If all critical files already have solid tests, **stop** — log "test coverage is healthy" and no-op.
- If testing a file requires building a complex test harness that doesn't exist yet, log it in `issues_to_look/` with details.

### 5. Verification

- **Zero Failures**: Run `pnpm test` — all tests (old + new) must pass.
- **Linting**: Run `pnpm lint` — no lint issues from new test files.

## Design Philosophy

- **Reliability First**: Tests must be deterministic and never flaky.
- **Deep Coverage**: Don't just test the "happy path" — test the "angry path" too.
- **Maintainable Code**: Keep test code clean and descriptive.

## Issue Cleanup

If an issue from `issues_to_look/` is resolved, or if it is found to be already resolved, move the issue file to the `issues_to_look/resolved/` directory to keep things clean.
