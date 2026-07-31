import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECURRING_EXPENSE_CURRENCY_CACHE_KEY,
  recurringExpenseCurrencyCache,
} from "../settings-cache";
import { RECURRING_EXPENSE_SETTINGS_DEFAULTS } from "../config";

describe("recurringExpenseCurrencyCache", () => {
  let values: Record<string, string>;

  beforeEach(() => {
    values = {};
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => values[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          values[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete values[key];
        }),
      },
    });
  });

  it("reads and writes only a valid uppercase default currency", () => {
    recurringExpenseCurrencyCache.write({
      ...RECURRING_EXPENSE_SETTINGS_DEFAULTS,
      defaultCurrency: "INR",
    });

    expect(values[RECURRING_EXPENSE_CURRENCY_CACHE_KEY]).toBe(
      JSON.stringify({ defaultCurrency: "INR" }),
    );
    expect(recurringExpenseCurrencyCache.read()).toEqual({
      defaultCurrency: "INR",
    });
  });

  it("ignores malformed storage payloads and invalid currency codes", () => {
    values[RECURRING_EXPENSE_CURRENCY_CACHE_KEY] = JSON.stringify({
      defaultCurrency: "inr",
    });
    expect(recurringExpenseCurrencyCache.read()).toBeNull();

    values[RECURRING_EXPENSE_CURRENCY_CACHE_KEY] = "{";
    expect(recurringExpenseCurrencyCache.read()).toBeNull();

    recurringExpenseCurrencyCache.write({
      ...RECURRING_EXPENSE_SETTINGS_DEFAULTS,
      defaultCurrency: "US",
    });
    expect(values[RECURRING_EXPENSE_CURRENCY_CACHE_KEY]).toBe("{");
  });

  it("treats storage access exceptions as cache misses", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(() => {
          throw new DOMException("blocked", "SecurityError");
        }),
        setItem: vi.fn(() => {
          throw new DOMException("quota", "QuotaExceededError");
        }),
      },
    });

    expect(recurringExpenseCurrencyCache.read()).toBeNull();
    expect(() =>
      recurringExpenseCurrencyCache.write({
        ...RECURRING_EXPENSE_SETTINGS_DEFAULTS,
        defaultCurrency: "GBP",
      }),
    ).not.toThrow();
  });
});
