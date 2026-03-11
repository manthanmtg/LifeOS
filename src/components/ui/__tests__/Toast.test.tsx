import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Toast from '../Toast';

describe('Toast', () => {
    it('auto-closes after the provided duration', () => {
        vi.useFakeTimers();
        const onClose = vi.fn();

        render(
            <Toast
                message="Saved"
                type="success"
                isVisible
                duration={1200}
                onClose={onClose}
            />
        );

        vi.advanceTimersByTime(1199);
        expect(onClose).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('runs the action and closes the toast when the action button is clicked', () => {
        const onClose = vi.fn();
        const onAction = vi.fn();

        render(
            <Toast
                message="Item deleted"
                type="info"
                isVisible
                onClose={onClose}
                action={{ label: 'Undo', onClick: onAction }}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

        expect(onAction).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not render content when hidden', () => {
        render(
            <Toast
                message="Hidden"
                type="error"
                isVisible={false}
                onClose={vi.fn()}
            />
        );

        expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });
});
