import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TodoAdminView from '../AdminView';
import React from 'react';

describe('TodoAdminView', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/system') {
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

    it('renders the Todo Manager view', async () => {
        render(<TodoAdminView />);
        await waitFor(() => {
            expect(screen.queryByText(/Loading/i)).toBeNull();
        }, { timeout: 2000 });

        // Check for common Todo UI elements
        expect(screen.getByPlaceholderText(/What needs to be done/i)).toBeDefined();
    });
});
