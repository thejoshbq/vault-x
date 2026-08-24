import type { CurrencyCode } from "@/lib/domain";

export function formatMoney(
  amountMinor: number,
  currency: CurrencyCode = "USD",
  options: { compact?: boolean; signDisplay?: Intl.NumberFormatOptions["signDisplay"] } = {},
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: options.compact ? 1 : 2,
    signDisplay: options.signDisplay,
  }).format(amountMinor / 100);
}

export function toMinorUnits(value: string | number) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) throw new Error("Enter a valid amount");
  return Math.round(parsed * 100);
}

export function fromMinorUnits(value: number) {
  return (value / 100).toFixed(2);
}

export function percent(part: number, whole: number) {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 100);
}
