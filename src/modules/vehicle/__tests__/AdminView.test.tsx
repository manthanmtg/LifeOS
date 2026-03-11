import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VehicleAdminView from '../AdminView';
import React from 'react';

describe('VehicleAdminView', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('renders and interacts with vehicle tabs', async () => {
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url === '/api/system') {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
            }
            if (url.includes('/api/content')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: [{
                            _id: 'v1',
                            _collection: 'vehicle',
                            payload: {
                                name: 'Tesla Model 3',
                                nickname: 'Sparky',
                                make: 'Tesla',
                                model: '3',
                                year: 2022,
                                type: 'car',
                                fuel_type: 'electric',
                                odometer_reading: 15000,
                                odometer_unit: 'km',
                                status: 'active',
                                service_records: [],
                                fuel_logs: [],
                                documents: []
                            }
                        }]
                    }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        });

        const { queryByText, findByText } = render(<VehicleAdminView />);

        await waitFor(() => {
            expect(queryByText(/Loading/i)).toBeNull();
        }, { timeout: 2000 });

        expect(await findByText(/Tesla Model 3/i)).toBeTruthy();

        // Find vehicle card
        const card = await findByText(/Tesla Model 3/i);
        fireEvent.click(card);

        // Interact with tabs
        const tabs = ['Overview', 'Service History', 'Fuel Log', 'Documents'];
        for (const tabName of tabs) {
            const tab = await screen.findByRole('button', { name: new RegExp(tabName, 'i') });
            if (tab) {
                fireEvent.click(tab);
            }
        }
    });
});
