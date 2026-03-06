import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackEvent } from '../analytics';

describe('analytics', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn().mockImplementation(() => Promise.resolve({ ok: true }));
    });

    it('does nothing if window is undefined', async () => {
        const originalWindow = global.window;
        delete (global as { window?: Window | undefined }).window;

        await trackEvent({ action: 'test' });
        expect(global.fetch).not.toHaveBeenCalled();

        global.window = originalWindow;
    });

    it('calls fetch with correct payload on desktop', async () => {
        // Mock window properties
        vi.stubGlobal('window', {
            innerWidth: 1200,
            location: { pathname: '/test', search: '?q=1' }
        });
        vi.stubGlobal('document', {
            referrer: 'https://google.com'
        });

        await trackEvent({ action: 'test_action', module: 'test_module' });

        expect(global.fetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"device_type":"desktop"')
        }));

        const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string);
        expect(body.action).toBe('test_action');
        expect(body.device_type).toBe('desktop');
        expect(body.path).toBe('/test?q=1');
    });

    it('detects mobile device type', async () => {
        vi.stubGlobal('window', {
            innerWidth: 500,
            location: { pathname: '/', search: '' }
        });

        await trackEvent({ action: 'test' });

        const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string);
        expect(body.device_type).toBe('mobile');
    });
});
