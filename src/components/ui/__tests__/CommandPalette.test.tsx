import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routerMocks } from '@/test/mocks/navigation';
import CommandPalette from '../CommandPalette';

describe('CommandPalette', () => {
    beforeEach(() => {
        vi.useRealTimers();
        global.fetch = vi.fn();
    });

    it('hides disabled modules from the command list', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
            json: async () => ({
                data: {
                    moduleRegistry: {
                        expenses: { enabled: false, isPublic: false },
                    },
                },
            }),
        } as Response);

        render(<CommandPalette />);
        openPalette();

        await waitFor(() => expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument());

        expect(screen.queryByText('Go to Expenses')).not.toBeInTheDocument();
        expect(screen.getByText('Go to Blog')).toBeInTheDocument();
    });

    it('filters commands and routes when a result is selected', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
            json: async () => ({ data: {} }),
        } as Response);

        render(<CommandPalette />);
        openPalette();

        await waitFor(() => expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument());

        const input = screen.getByPlaceholderText(/Type a command/i);
        fireEvent.change(input, { target: { value: 'settings' } });
        fireEvent.click(screen.getByRole('button', { name: /Go to Settings/i }));

        expect(routerMocks.push).toHaveBeenCalledWith('/admin/settings');
    });

    it('shows an empty state when no command matches the query', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
            json: async () => ({ data: {} }),
        } as Response);

        render(<CommandPalette />);
        openPalette();

        await waitFor(() => expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument());

        fireEvent.change(screen.getByPlaceholderText(/Type a command/i), { target: { value: 'zzzz' } });

        expect(screen.getByText('No results found')).toBeInTheDocument();
    });
});

function openPalette() {
    act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' }));
    });
}
