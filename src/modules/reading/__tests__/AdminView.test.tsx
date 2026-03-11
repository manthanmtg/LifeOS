import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReadingListAdminView from '../AdminView';
import React from 'react';

describe('ReadingListAdminView', () => {
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

    it('renders the Reading List view', async () => {
        render(<ReadingListAdminView />);
        await waitFor(() => {
            expect(screen.queryByText(/Loading/i)).toBeNull();
        }, { timeout: 2000 });

        expect(screen.getByText(/Reading Queue/i)).toBeDefined();
    });
});
