import type { ExpenseSpaceNumberFormat } from "./types";

const UNDER_TWENTY = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function belowOneThousand(value: number): string {
  if (value < 20) return UNDER_TWENTY[value];
  if (value < 100) {
    return `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${UNDER_TWENTY[value % 10]}` : ""}`;
  }

  return `${UNDER_TWENTY[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${belowOneThousand(value % 100)}` : ""}`;
}

function wholeNumberInWords(
  value: number,
  numberFormat: ExpenseSpaceNumberFormat,
): string {
  if (value === 0) return "Zero";

  const scales: Array<[number, string]> =
    numberFormat === "indian"
      ? [
          [10000000, "Crore"],
          [100000, "Lakh"],
          [1000, "Thousand"],
        ]
      : [
          [1000000000, "Billion"],
          [1000000, "Million"],
          [1000, "Thousand"],
        ];
  const parts: string[] = [];
  let remainder = value;

  for (const [scale, label] of scales) {
    const group = Math.floor(remainder / scale);
    if (group > 0) {
      parts.push(`${belowOneThousand(group)} ${label}`);
      remainder %= scale;
    }
  }
  if (remainder > 0) parts.push(belowOneThousand(remainder));

  return parts.join(" ");
}

export function amountInWords(
  amount: string,
  numberFormat: ExpenseSpaceNumberFormat,
): string {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return "";

  const [whole, decimal = ""] = amount.split(".");
  const wholeValue = Number(whole);
  if (!Number.isSafeInteger(wholeValue) || wholeValue < 0) return "";

  const words = wholeNumberInWords(wholeValue, numberFormat);
  const decimalDigits = decimal.replace(/\D/g, "").slice(0, 2);
  const decimalValue = Number(decimalDigits);

  return decimalValue > 0
    ? `${words} Point ${wholeNumberInWords(decimalValue, numberFormat)}`
    : words;
}
