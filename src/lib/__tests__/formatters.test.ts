import { describe, it, expect } from 'vitest';
import { formatNumber, formatCurrency } from '../formatters';

describe('formatters', () => {
    describe('formatNumber', () => {
        it('formats correctly in western system', () => {
            expect(formatNumber(1234.56, 'western', 2)).toContain('1,234.56');
        });

        it('formats correctly in indian system', () => {
            expect(formatNumber(1234567, 'indian', 0)).toBe('12,34,567');
        });
    });

    describe('formatCurrency', () => {
        it('prefixes with symbol', () => {
            expect(formatCurrency(100, '₹', 'indian')).toBe('₹100');
        });
    });
});
