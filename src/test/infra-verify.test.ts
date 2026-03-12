import { describe, it, expect } from 'vitest';

describe('Infrastructure Verification', () => {
    it('should pass a basic sanity test', () => {
        expect(1 + 1).toBe(2);
    });

    it('should have access to global vitest functions', () => {
        expect(vi).toBeDefined();
    });
});
