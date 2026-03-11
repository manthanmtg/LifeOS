import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SnippetsAdminView from '../AdminView';
import React from 'react';

describe('SnippetsAdminView', () => {
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

    it('renders the Snippets view', async () => {
        render(<SnippetsAdminView />);
        await waitFor(() => {
            expect(screen.queryByText(/Loading/i)).toBeNull();
        }, { timeout: 2000 });

        expect(screen.getByText(/Snippet Box/i)).toBeDefined();
    });
});
