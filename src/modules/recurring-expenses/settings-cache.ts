import type { ModuleSettingsBrowserCache } from "@/hooks/useModuleSettings";
import type { RecurringExpenseSettings } from "./types";

export const RECURRING_EXPENSE_CURRENCY_CACHE_KEY =
  "lifeos:recurring-expenses:default-currency:v1";

function isValidCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export const recurringExpenseCurrencyCache: ModuleSettingsBrowserCache<RecurringExpenseSettings> =
  {
    read() {
      try {
        const raw = storage()?.getItem(RECURRING_EXPENSE_CURRENCY_CACHE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !isValidCurrencyCode(
            (parsed as { defaultCurrency?: unknown }).defaultCurrency,
          )
        ) {
          return null;
        }
        return {
          defaultCurrency: (parsed as { defaultCurrency: string })
            .defaultCurrency,
        };
      } catch {
        return null;
      }
    },
    write(settings) {
      if (!isValidCurrencyCode(settings.defaultCurrency)) return;
      try {
        storage()?.setItem(
          RECURRING_EXPENSE_CURRENCY_CACHE_KEY,
          JSON.stringify({ defaultCurrency: settings.defaultCurrency }),
        );
      } catch {
        // Browser storage is an optimization only.
      }
    },
  };
