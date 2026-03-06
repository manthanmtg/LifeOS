import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmiTrackerAdminView from '../AdminView';
import React from 'react';

describe('EmiTrackerAdminView', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('renders the EMI Tracker view and interacts with tabs', async () => {
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/system') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
            }
            if (url.includes('/api/content')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: [{
                            _id: 'loan-1',
                            _collection: 'emi-tracker',
                            payload: {
                                title: 'Home Loan',
                                lender_name: 'HDFC',
                                category: 'Home Loan',
                                principal: 5000000,
                                currency: 'INR',
                                tenure_months: 240,
                                annual_interest_rate: 8.5,
                                interest_type: 'floating',
                                monthly_emi: 43391,
                                start_date: '2024-01-01',
                                due_day_of_month: 5,
                                status: 'active',
                                payments: [],
                                documents: [],
                                recast_strategy: 'keep_tenure_adjust_emi',
                                rate_adjustments: []
                            }
                        }]
                    }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        const { getByText, queryByText, findAllByText, getByRole } = render(<EmiTrackerAdminView />);

        await waitFor(() => {
            expect(queryByText(/Loading/i)).toBeNull();
        }, { timeout: 2000 });

        expect(getByText(/EMI Tracker/i)).toBeTruthy();

        // Find the loan card and click it (it might appear in stats too, so take the last one which is the card)
        const loanCards = await findAllByText(/Home Loan/i, {}, { timeout: 4000 });
        fireEvent.click(loanCards[loanCards.length - 1]);

        // Check if details are shown
        await waitFor(() => {
            expect(getByText(/Outstanding Balance/i)).toBeTruthy();
        });

        // Click on Schedule tab
        const scheduleTab = getByRole('button', { name: /Schedule/i });
        fireEvent.click(scheduleTab);
        expect(getByRole('columnheader', { name: /Principal/i })).toBeTruthy();

        // Click on Payments tab
        const paymentsTab = getByRole('button', { name: /Payments/i });
        fireEvent.click(paymentsTab);
        expect(getByText(/Payment History/i)).toBeTruthy();

        // Open settings
        const settingsBtn = screen.getByLabelText(/Module settings/i);
        fireEvent.click(settingsBtn);
        expect(getByText(/EMI Tracker Settings/i)).toBeTruthy();
    });

    it('renders "No Loans Found" when data is empty', async () => {
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/system') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
            }
            if (url.includes('/api/content')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        render(<EmiTrackerAdminView />);
        await waitFor(() => {
            expect(screen.queryByText(/Loading/i)).toBeNull();
        }, { timeout: 2000 });

        expect(screen.getByText(/No loans yet/i)).toBeTruthy();
    });
});
