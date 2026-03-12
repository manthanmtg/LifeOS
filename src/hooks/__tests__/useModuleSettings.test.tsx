import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useModuleSettings } from '../useModuleSettings';

describe('useModuleSettings', () => {
    beforeEach(() => {
        vi.useRealTimers();
        global.fetch = vi.fn();
    });

    it('loads stored settings and merges them with defaults', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
            json: async () => ({
                data: {
                    widgetSettings: {
                        enabled: false,
                    },
                },
            }),
        } as Response);

        const { result } = renderHook(() =>
            useModuleSettings('widgetSettings', {
                enabled: true,
                theme: 'ocean',
            })
        );

        await waitFor(() => expect(result.current.loaded).toBe(true));

        expect(result.current.settings).toEqual({
            enabled: false,
            theme: 'ocean',
        });
        expect(global.fetch).toHaveBeenCalledWith('/api/system');
    });

    it('marks the hook as loaded even when the initial fetch fails', async () => {
        vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network down'));

        const { result } = renderHook(() =>
            useModuleSettings('widgetSettings', {
                enabled: true,
            })
        );

        await waitFor(() => expect(result.current.loaded).toBe(true));

        expect(result.current.settings).toEqual({ enabled: true });
    });

    it('optimistically updates settings, sends the merged payload, and clears saving state', async () => {
        vi.mocked(global.fetch)
            .mockResolvedValueOnce({
                json: async () => ({ data: {} }),
            } as Response)
            .mockResolvedValueOnce({ ok: true } as Response);

        const { result } = renderHook(() =>
            useModuleSettings('widgetSettings', {
                enabled: true,
                theme: 'ocean',
            })
        );

        await waitFor(() => expect(result.current.loaded).toBe(true));

        await act(async () => {
            await result.current.updateSettings({ theme: 'forest' });
        });

        expect(result.current.settings).toEqual({
            enabled: true,
            theme: 'forest',
        });
        expect(result.current.saving).toBe(true);
        expect(global.fetch).toHaveBeenLastCalledWith('/api/system', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                widgetSettings: {
                    enabled: true,
                    theme: 'forest',
                },
            }),
        });

        await waitFor(() => expect(result.current.saving).toBe(false), { timeout: 1000 });
    });
});
