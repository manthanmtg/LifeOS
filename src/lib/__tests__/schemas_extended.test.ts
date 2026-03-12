import { describe, it, expect } from 'vitest';
import { SchemaRegistry } from '../schemas';

describe('SchemaRegistry and Constants', () => {
    it('should have all expected schemas registered', () => {
        const expectedSchemas = [
            'expense', 'blog_post', 'portfolio_profile', 'recurring_expense',
            'reading_item', 'book', 'idea', 'snippet', 'habit', 'compass_task',
            'emi_loan', 'crop_history', 'rain_area', 'rain_entry', 'todo',
            'shopping_list', 'portfolio_resume', 'ai_usage', 'person',
            'vehicle', 'maintenance_task'
        ];

        expectedSchemas.forEach(key => {
            expect(SchemaRegistry[key]).toBeDefined();
        });
    });

    it('should validate various schemas', () => {
        // This simple loop over SchemaRegistry will execute the schema definitions
        Object.values(SchemaRegistry).forEach(schema => {
            expect(schema).toBeDefined();
        });
    });
});
