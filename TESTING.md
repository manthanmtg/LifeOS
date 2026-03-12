# Testing Guide

This repository uses [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for testing.

## Running Tests

### Standard Run
Run all tests once:
```bash
pnpm test
```

### Watch Mode
Run tests in watch mode for development:
```bash
pnpm test:watch
```

### Code Coverage
Generate a code coverage report:
```bash
pnpm test:coverage
```
The report will be generated in the `coverage/` directory. You can view the HTML report by opening `coverage/index.html` in your browser.

### Vitest UI
Launch the Vitest UI for a better visual experience:
```bash
pnpm test:ui
```

## Writing Tests

### File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- Component tests: `*.test.tsx`
- Store tests in a `__tests__` directory near the code or alongside the file.

### Example Unit Test
```typescript
import { describe, it, expect } from 'vitest';

describe('math', () => {
  it('adds 1 + 2 to equal 3', () => {
    expect(1 + 2).toBe(3);
  });
});
```

### Example Component Test
```tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

## Configuration
- `vitest.config.ts`: Main Vitest configuration.
- `src/test/setup.ts`: Global test setup (mocks, custom matches).
