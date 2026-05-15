export type NumberFormat = "western" | "indian";

/**
 * Formats a number according to the specified system (Western or Indian).
 * @param num The number to format
 * @param format The formatting system ("western" or "indian")
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted string
 */
export function formatNumber(
  num: number,
  format: NumberFormat = "western",
  decimals: number = 0,
): string {
  const parts = num.toFixed(decimals).split(".");
  const integerPart = parts[0];
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedIntegerPart = sign ? integerPart.slice(1) : integerPart;
  const decimalPart = parts.length > 1 ? "." + parts[1] : "";

  if (format === "indian") {
    if (unsignedIntegerPart.length <= 3) {
      return sign + unsignedIntegerPart + decimalPart;
    }

    const lastThree = unsignedIntegerPart.slice(-3);
    const otherParts = unsignedIntegerPart.slice(0, -3);
    return (
      sign +
      otherParts.replace(/\B(?=(\d{2})+(?!\d))/g, ",") +
      "," +
      lastThree +
      decimalPart
    );
  }

  // Fallback to Western (Locale-aware)
  return (
    sign + Number(unsignedIntegerPart).toLocaleString("en-US") + decimalPart
  );
}

/**
 * Formats a currency amount with symbol and specified number system.
 * @param amount The value to format
 * @param currencySymbol The symbol to prefix (e.g., "$", "₹")
 * @param format The formatting system ("western" or "indian")
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currencySymbol: string,
  format: NumberFormat = "western",
  decimals: number = 0,
): string {
  return `${currencySymbol}${formatNumber(amount, format, decimals)}`;
}
