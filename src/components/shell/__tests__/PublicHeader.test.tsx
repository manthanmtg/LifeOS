import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicHeader from '../PublicHeader';

describe('PublicHeader', () => {
    beforeEach(() => {
        vi.useRealTimers();
        global.fetch = vi.fn();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('loads branding, orders public modules, and excludes portfolio from navigation links', async () => {
        vi.mocked(global.fetch)
            .mockResolvedValueOnce({
                json: async () => ({
                    data: [
                        { payload: { full_name: 'Ada Lovelace' } },
                    ],
                }),
            } as Response)
            .mockResolvedValueOnce({
                json: async () => ({
                    data: {
                        moduleRegistry: {
                            blog: { name: 'Blog', enabled: true, isPublic: true },
                            portfolio: { name: 'Portfolio', enabled: true, isPublic: true },
                            slides: { name: 'Slides', enabled: true, isPublic: true },
                            expenses: { name: 'Expenses', enabled: true, isPublic: false },
                        },
                        moduleOrder: ['slides', 'portfolio', 'blog'],
                    },
                }),
            } as Response);

        render(<PublicHeader initialUserName="Life OS" />);

        await waitFor(() => expect(screen.getByRole('link', { name: 'Ada Lovelace' })).toBeInTheDocument());

        const links = screen.getAllByRole('link');
        const labels = links.map((link) => link.textContent);

        expect(labels).toContain('Slides');
        expect(labels).toContain('Blog');
        expect(labels).not.toContain('Portfolio');
        expect(labels).not.toContain('Expenses');
        expect(labels.indexOf('Slides')).toBeLessThan(labels.indexOf('Blog'));
    });

    it('falls back to default public modules when system config fetch fails', async () => {
        vi.mocked(global.fetch)
            .mockResolvedValueOnce({
                json: async () => ({ data: [] }),
            } as Response)
            .mockRejectedValueOnce(new Error('system down'));

        render(<PublicHeader />);

        await waitFor(() => expect(screen.getByRole('link', { name: 'Blog' })).toBeInTheDocument());

        expect(screen.queryByRole('link', { name: 'Portfolio' })).not.toBeInTheDocument();
        expect(console.error).toHaveBeenCalled();
    });

    it('closes the mobile menu after tapping a navigation item', async () => {
        vi.mocked(global.fetch)
            .mockResolvedValueOnce({
                json: async () => ({ data: [] }),
            } as Response)
            .mockResolvedValueOnce({
                json: async () => ({
                    data: {
                        moduleRegistry: {
                            blog: { name: 'Blog', enabled: true, isPublic: true },
                        },
                        moduleOrder: ['blog'],
                    },
                }),
            } as Response);

        render(<PublicHeader />);

        await waitFor(() => expect(screen.getByRole('button')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button'));
        const mobileBlogLink = await screen.findAllByRole('link', { name: 'Blog' });
        fireEvent.click(mobileBlogLink[mobileBlogLink.length - 1]);

        await waitFor(() => expect(screen.queryAllByRole('link', { name: 'Blog' })).toHaveLength(1));
    });
});
