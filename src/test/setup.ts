import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import React, { act } from "react";

// Node 25 exposes an experimental localStorage global that is incomplete when
// no --localstorage-file is configured. Vitest's JSDOM global can inherit that
// object, so normalize it to the browser Storage contract for every test.
if (
  typeof window !== "undefined" &&
  typeof window.localStorage?.clear !== "function"
) {
  const values = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memoryStorage,
  });
}

// Polyfill React.act if it's missing (needed for React 19 in some test environments)
if (!React.act && act) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (React as any).act = act;
}

import {
  routerMocks,
  navigationState,
  resetNavigationMocks,
} from "./mocks/navigation";

// Global cleanup after each test
afterEach(() => {
  cleanup();
  resetNavigationMocks();
});

// Mock Next.js router/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
  usePathname: () => navigationState.pathname,
  useSearchParams: () => navigationState.searchParams,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: { children?: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock window.matchMedia
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
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
}

// Mock lucide-react with a Proxy to handle all icons (with PascalCase check to avoid hangs)
vi.mock("lucide-react", () => {
  const mocks: Record<
    string,
    React.FC<React.SVGProps<SVGSVGElement>> | boolean
  > = { __esModule: true };
  return new Proxy(mocks, {
    get: (target, prop) => {
      if (typeof prop === "string" && /^[A-Z]/.test(prop)) {
        if (!target[prop]) {
          const MockIcon = (props: React.SVGProps<SVGSVGElement>) =>
            React.createElement("svg", {
              ...props,
              "data-testid": `icon-${prop.toLowerCase()}`,
            });
          MockIcon.displayName = prop;
          target[prop] = MockIcon;
        }
        return target[prop];
      }
      return (target as Record<string | symbol, unknown>)[prop];
    },
  });
});

// Mock framer-motion
vi.mock("framer-motion", () => {
  const motionProxy = new Proxy(
    {},
    {
      get: (_target, key) => {
        return ({
          children,
          ...props
        }: { children?: React.ReactNode } & Record<string, unknown>) => {
          // Destructure all motion-specific props so they don't leak to the DOM
          const {
            initial,
            animate,
            exit,
            transition,
            layout,
            layoutId,
            whileHover,
            whileInView,
            whileTap,
            whileFocus,
            drag,
            dragConstraints,
            dragElastic,
            dragMomentum,
            onDragStart,
            onDragEnd,
            onDrag,
            viewport,
            variants,
            ...rest
          } = props;
          // Silence unused var warnings
          void initial;
          void animate;
          void exit;
          void transition;
          void layout;
          void layoutId;
          void whileHover;
          void whileInView;
          void whileTap;
          void whileFocus;
          void drag;
          void dragConstraints;
          void dragElastic;
          void dragMomentum;
          void onDragStart;
          void onDragEnd;
          void onDrag;
          void viewport;
          void variants;

          return React.createElement(key as string, { ...rest }, children);
        };
      },
    },
  );

  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useInView: () => [null, false],
    useScroll: () => ({
      scrollY: { get: () => 0 },
      scrollYProgress: { get: () => 0 },
    }),
    useReducedMotion: () => false,
  };
});

// Mock recharts
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("svg", {}, children),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", {}, children),
  Area: () => null,
  AreaChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("svg", {}, children),
  Cell: () => null,
  Pie: () => null,
  PieChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("svg", {}, children),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};
