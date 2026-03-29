# Test Adder Prompt

## Objective

Identify missing test paths and low-coverage modules in the LifeOS codebase. Systematically generate and add 50-100 Vitest tests at a time to achieve near-total coverage for critical paths and edge cases.

## Workflow

### 1. Coverage Gap Identification

- **Module Scan**: Identify modules with missing `__tests__` directories or low coverage.
- **Path Analysis**: Look for complex conditionals, error handlers, and async transitions that are not currently exercised in existing tests.
- **Priority**: Focus on `src/lib/auth.ts`, `src/app/api`, and complex `AdminView` logic.

### 2. Bulk Test Generation

- **Vitest Suite**: Generate comprehensive `describe` blocks for each component/utility.
- **Coverage Goals**: Aim for 100% path coverage in the targeted area.
- **Mocking Strategy**: Use `vi.mock` for external dependencies like `MongoClient`, `jose`, or `next/navigation`.
- **Edge Cases**: Include tests for invalid inputs, missing cookies, network timeouts, and Zod validation failures.

### 3. Implementation Patterns

- **Shared Fixtures**: Use centralized test data from a `tests/fixtures` directory if available, or define robust local constants.
- **Asynchronous Testing**: Use `waitFor` or `findBy` for components that fetch data.
- **Polymorphic Data**: Add tests for various `module_type` scenarios in the `content` collection.

### 4. Verification & Refinement

- **Zero Failures**: Run `pnpm test` (Vitest) to ensure all new tests pass.
- **Linting**: Run `pnpm lint` to ensure no Vitest-related lint errors (e.g., unused mocks).
- **Coverage Check**: Verify the increase in coverage using Vitest's coverage report (if configured).

## Design Philosophy

- **Reliability First**: Tests must be deterministic and never flaky.
- **Deep Coverage**: Don't just test the "happy path"—test the "angry path" too.
- **Maintainable Code**: Keep test code clean and descriptive.
