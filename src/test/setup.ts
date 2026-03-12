import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import React from 'react';
import { routerMocks, navigationState, resetNavigationMocks } from './mocks/navigation';

// Global cleanup after each test
afterEach(() => {
    cleanup();
    resetNavigationMocks();
});

// Mock Next.js router/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => routerMocks,
    usePathname: () => navigationState.pathname,
    useSearchParams: () => navigationState.searchParams,
}));

vi.mock('next/link', () => ({
    default: ({ children, href, ...props }: { children?: React.ReactNode; href: string } & Record<string, unknown>) =>
        React.createElement('a', { href, ...props }, children),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock lucide-react with a Proxy to handle all icons (with PascalCase check to avoid hangs)
vi.mock('lucide-react', () => {
    const mocks: Record<string, React.FC<React.SVGProps<SVGSVGElement>> | boolean> = { __esModule: true };
    return new Proxy(mocks, {
        get: (target, prop) => {
            if (typeof prop === 'string' && /^[A-Z]/.test(prop)) {
                if (!target[prop]) {
                    const MockIcon = (props: React.SVGProps<SVGSVGElement>) => React.createElement('svg', {
                        ...props,
                        'data-testid': `icon-${prop.toLowerCase()}`,
                    });
                    MockIcon.displayName = prop;
                    target[prop] = MockIcon;
                }
                return target[prop];
            }
            return (target as Record<string | symbol, unknown>)[prop];
        }
    });
});

// Mock framer-motion
vi.mock('framer-motion', () => {
    const motionProxy = new Proxy({}, {
        get: (_target, key) => {
            return ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => {
                const { initial, animate, exit, transition, ...rest } = props;
                void initial; void animate; void exit; void transition;
                return React.createElement(key as string, { ...rest }, children);
            };
        }
    });

    return {
        motion: motionProxy,
        AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
    };
});

// Mock recharts
vi.mock('recharts', () => ({
    BarChart: ({ children }: { children?: React.ReactNode }) => React.createElement('div', {}, children),
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => React.createElement('div', {}, children),
    Area: () => null,
    AreaChart: ({ children }: { children?: React.ReactNode }) => React.createElement('div', {}, children),
    Cell: () => null,
    Pie: () => null,
    PieChart: ({ children }: { children?: React.ReactNode }) => React.createElement('div', {}, children),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
};
