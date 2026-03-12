import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ZenModeProvider from '../ZenMode';

describe('ZenModeProvider', () => {
    it('waits for mount before rendering the zen mode indicator', () => {
        vi.useFakeTimers();

        render(
            <ZenModeProvider>
                <div>Content</div>
            </ZenModeProvider>
        );

        expect(screen.queryByText(/Zen Mode/)).not.toBeInTheDocument();

        act(() => {
            vi.runOnlyPendingTimers();
        });

        expect(screen.queryByText(/Zen Mode/)).not.toBeInTheDocument();
    });

    it('toggles zen mode with the keyboard shortcut', () => {
        vi.useFakeTimers();

        render(
            <ZenModeProvider>
                <div>Content</div>
            </ZenModeProvider>
        );

        act(() => {
            vi.runOnlyPendingTimers();
        });

        fireZenShortcut();
        expect(screen.getByText(/Zen Mode/)).toBeInTheDocument();

        fireZenShortcut();
        expect(screen.queryByText(/Zen Mode/)).not.toBeInTheDocument();
    });

    it('removes the keyboard listener on unmount', () => {
        vi.useFakeTimers();
        const removeSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = render(
            <ZenModeProvider>
                <div>Content</div>
            </ZenModeProvider>
        );

        unmount();

        expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
});

function fireZenShortcut() {
    act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'Z' }));
    });
}
