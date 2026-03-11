import { vi } from "vitest";

export const routerMocks = {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
};

export const navigationState = {
    pathname: "/",
    searchParams: new URLSearchParams(),
};

export function resetNavigationMocks() {
    routerMocks.push.mockReset();
    routerMocks.replace.mockReset();
    routerMocks.prefetch.mockReset();
    routerMocks.back.mockReset();
    navigationState.pathname = "/";
    navigationState.searchParams = new URLSearchParams();
}
