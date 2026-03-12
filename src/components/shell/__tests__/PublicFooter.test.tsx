import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicFooter from '../PublicFooter';

describe('PublicFooter', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    it('renders only social links with both platform and URL', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
            json: async () => ({
                data: [
                    {
                        payload: {
                            social_links: [
                                { platform: 'GitHub', url: 'https://github.com/example' },
                                { platform: 'X', url: '' },
                                { platform: '', url: 'https://example.com' },
                            ],
                        },
                    },
                ],
            }),
        } as Response);

        render(<PublicFooter />);

        expect(await screen.findByRole('link', { name: /GitHub/i })).toHaveAttribute('href', 'https://github.com/example');
        expect(screen.queryByRole('link', { name: /X/i })).not.toBeInTheDocument();
    });

    it('keeps the static footer content when profile fetch fails', async () => {
        vi.mocked(global.fetch).mockRejectedValueOnce(new Error('unavailable'));

        render(<PublicFooter />);

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/content?module_type=portfolio_profile'));
        expect(screen.getByText(/Built with/)).toBeInTheDocument();
    });
});
