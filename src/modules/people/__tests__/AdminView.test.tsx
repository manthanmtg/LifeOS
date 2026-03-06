import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PeopleAdminView from '../AdminView';
import React from 'react';

describe('PeopleAdminView', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('renders and interacts with people tabs', async () => {
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/system') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
            }
            if (url.includes('/api/content')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: [{
                            _id: 'p1',
                            _collection: 'people',
                            payload: {
                                name: 'John Doe',
                                relationship: 'friend',
                                status: 'active',
                                birthday: '1990-01-01',
                                last_contacted: '2024-01-01',
                                interests: [],
                                tags: [],
                                social_links: [],
                                interactions: [],
                                notes: 'Test Note'
                            }
                        }]
                    }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        const { getByText, queryByText, findByText } = render(<PeopleAdminView />);

        await waitFor(() => {
            expect(queryByText(/Loading/i)).toBeNull();
        }, { timeout: 2000 });

        expect(getByText(/People/i)).toBeTruthy();

        // Find person card
        const card = await findByText(/John Doe/i);
        fireEvent.click(card);

        // Verify detail view content
        await waitFor(() => {
            expect(screen.getByText(/Test Note/i)).toBeTruthy();
        });
        expect(screen.getByText(/friend/i)).toBeTruthy();
    });
});
