import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AiUsageAdminView from '../AdminView';
import React from 'react';

describe('AiUsageAdminView', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/ai-usage/providers') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ data: [] }), // Crucial fix: return array, not object
                });
            }
            if (url === '/api/system' || url === '/api/ai-usage/limits') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ data: {} }),
                });
            }
            if (url.includes('/api/content')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ data: [] }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });
    });

    it('renders the AI Usage view', async () => {
        render(<AiUsageAdminView />);
        await waitFor(() => {
            expect(screen.queryByText(/Loading/i)).toBeNull();
        }, { timeout: 2000 });

        expect(screen.getByText(/AI Usage Tracker/i)).toBeDefined();
    });
});
