import { afterEach, describe, expect, it } from "vitest";
import { navigationState, resetNavigationMocks, routerMocks } from "./navigation";

describe("navigation mocks", () => {
  afterEach(() => {
    resetNavigationMocks();
  });

  it("exposes push, replace, prefetch, and back as spies", () => {
    expect(typeof routerMocks.push).toBe("function");
    expect(typeof routerMocks.replace).toBe("function");
    expect(typeof routerMocks.prefetch).toBe("function");
    expect(typeof routerMocks.back).toBe("function");
    expect(routerMocks.push.getMockName()).toBe("push");
  });

  it("starts with a clean default navigation state", () => {
    expect(navigationState.pathname).toBe("/");
    expect(navigationState.searchParams.toString()).toBe("");
  });

  it("allows reading and updating pathname directly", () => {
    navigationState.pathname = "/admin/expenses";
    expect(navigationState.pathname).toBe("/admin/expenses");
  });

  it("tracks search params using query-string mutations", () => {
    navigationState.searchParams = new URLSearchParams("view=grid&sort=date");
    navigationState.searchParams.set("filter", "open");

    expect(navigationState.searchParams.get("view")).toBe("grid");
    expect(navigationState.searchParams.get("sort")).toBe("date");
    expect(navigationState.searchParams.get("filter")).toBe("open");
    expect(navigationState.searchParams.toString()).toBe("view=grid&sort=date&filter=open");
  });

  it("records and resets router mock invocations", () => {
    routerMocks.push("/");
    routerMocks.replace("/admin");
    routerMocks.prefetch("/blog");
    routerMocks.back();

    expect(routerMocks.push).toHaveBeenCalledTimes(1);
    expect(routerMocks.replace).toHaveBeenCalledTimes(1);
    expect(routerMocks.prefetch).toHaveBeenCalledTimes(1);
    expect(routerMocks.back).toHaveBeenCalledTimes(1);

    resetNavigationMocks();

    expect(routerMocks.push).toHaveBeenCalledTimes(0);
    expect(routerMocks.replace).toHaveBeenCalledTimes(0);
    expect(routerMocks.prefetch).toHaveBeenCalledTimes(0);
    expect(routerMocks.back).toHaveBeenCalledTimes(0);
  });

  it("restores default state without mutating prior search params", () => {
    navigationState.pathname = "/reports";
    navigationState.searchParams = new URLSearchParams("a=1&b=2");
    const previousInstance = navigationState.searchParams;

    expect(previousInstance.get("a")).toBe("1");

    resetNavigationMocks();

    expect(navigationState.pathname).toBe("/");
    expect(navigationState.searchParams).not.toBe(previousInstance);
    expect(navigationState.searchParams.toString()).toBe("");
  });
});
