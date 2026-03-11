import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { navigationState } from '@/test/mocks/navigation';
import PageVisitTracker from '../PageVisitTracker';

describe('PageVisitTracker', () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('tracks admin module visits except settings', async () => {
        navigationState.pathname = '/admin/todo';

        render(<PageVisitTracker />);

        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith('/api/system/track-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ moduleKey: 'todo' }),
            })
        );
    });

    it('does not track non-module routes', async () => {
        navigationState.pathname = '/admin/settings';

        render(<PageVisitTracker />);

        await waitFor(() => expect(global.fetch).not.toHaveBeenCalled());
    });

    it('logs and swallows tracking failures', async () => {
        navigationState.pathname = '/admin/expenses';
        vi.mocked(global.fetch).mockRejectedValueOnce(new Error('boom'));

        render(<PageVisitTracker />);

        await waitFor(() => expect(console.error).toHaveBeenCalledWith('Failed to track visit', expect.any(Error)));
    });
});
