import { vi } from "vitest";

export const routerMocks = {
  push: vi.fn().mockName("push"),
  replace: vi.fn().mockName("replace"),
  prefetch: vi.fn().mockName("prefetch"),
  back: vi.fn().mockName("back"),
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
