import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { navigationState } from '@/test/mocks/navigation';
import MetricsTracker from '../MetricsTracker';

const trackEventMock = vi.fn();

vi.mock('@/lib/analytics', () => ({
    trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

describe('MetricsTracker', () => {
    beforeEach(() => {
        trackEventMock.mockReset().mockResolvedValue(undefined);
        navigationState.pathname = '/';
        navigationState.searchParams = new URLSearchParams();
    });

    it('records a session start for the first admin module view', async () => {
        navigationState.pathname = '/admin/todo';
        navigationState.searchParams = new URLSearchParams('tab=done');

        render(<MetricsTracker />);

        await waitFor(() =>
            expect(trackEventMock).toHaveBeenCalledWith({
                module: 'todo',
                action: 'session_start',
                label: '/admin/todo',
                path: '/admin/todo?tab=done',
            })
        );
    });

    it('records subsequent route changes as page views', async () => {
        navigationState.pathname = '/admin/todo';

        const { rerender } = render(<MetricsTracker />);

        await waitFor(() => expect(trackEventMock).toHaveBeenCalledTimes(1));

        navigationState.pathname = '/expenses';
        navigationState.searchParams = new URLSearchParams('view=month');
        rerender(<MetricsTracker />);

        await waitFor(() =>
            expect(trackEventMock).toHaveBeenLastCalledWith({
                module: 'expenses',
                action: 'page_view',
                label: '/expenses',
                path: '/expenses?view=month',
            })
        );
    });

    it('maps core routes to the core module', async () => {
        navigationState.pathname = '/login';

        render(<MetricsTracker />);

        await waitFor(() =>
            expect(trackEventMock).toHaveBeenCalledWith({
                module: 'core',
                action: 'session_start',
                label: '/login',
                path: '/login',
            })
        );
    });
});
