import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
    describe('cn', () => {
        it('merges class names correctly', () => {
            expect(cn('a', 'b')).toBe('a b');
        });

        it('handles conditional classes', () => {
            expect(cn('a', true && 'b', false && 'c')).toBe('a b');
        });

        it('merges tailwind classes correctly (resolving conflicts)', () => {
            // tailwind-merge should resolve px-2 and px-4 to px-4
            expect(cn('px-2', 'px-4')).toBe('px-4');
        });

        it('handles arrays and objects', () => {
            expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
        });
    });
});
