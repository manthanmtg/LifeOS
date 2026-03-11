import { describe, it, expect } from 'vitest';
import { CompassTaskSchema, RainEntrySchema, ExpenseSchema, EmiLoanSchema, PersonSchema } from '../schemas';

describe('schemas', () => {
    describe('CompassTaskSchema', () => {
        it('validates a valid task', () => {
            const task = {
                title: 'Test Task',
                priority: 'p1',
                status: 'backlog',
            };
            const result = CompassTaskSchema.safeParse(task);
            expect(result.success).toBe(true);
        });

        it('fails on missing title', () => {
            const task = {
                priority: 'p1',
                status: 'backlog'
            };
            const result = CompassTaskSchema.safeParse(task);
            expect(result.success).toBe(false);
        });
    });

    describe('RainEntrySchema', () => {
        it('validates a valid rain entry', () => {
            const entry = {
                area_id: 'area_1',
                rainfall_amount: 10.5,
                date: new Date().toISOString(),
            };
            const result = RainEntrySchema.safeParse(entry);
            expect(result.success).toBe(true);
        });
    });

    describe('ExpenseSchema', () => {
        it('validates a valid expense entry', () => {
            const expense = {
                amount: 100,
                currency: 'USD',
                description: 'Test Expense',
                category: 'Food',
                date: new Date().toISOString()
            };
            const result = ExpenseSchema.safeParse(expense);
            expect(result.success).toBe(true);
        });
    });

    describe('EmiLoanSchema', () => {
        it('validates a valid loan', () => {
            const loan = {
                title: 'Home Loan',
                principal: 5000000,
                tenure_months: 240,
                annual_interest_rate: 8.5,
                monthly_emi: 43391,
                interest_type: 'floating',
                start_date: new Date().toISOString(),
                due_day_of_month: 5
            };
            const result = EmiLoanSchema.safeParse(loan);
            expect(result.success).toBe(true);
        });
    });

    describe('PersonSchema', () => {
        it('validates a valid person', () => {
            const person = {
                name: 'Jane Doe',
                relationship: 'friend',
                is_favorite: true
            };
            const result = PersonSchema.safeParse(person);
            expect(result.success).toBe(true);
        });
    });
});
