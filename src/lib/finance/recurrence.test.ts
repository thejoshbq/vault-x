import { describe, expect, it } from "vitest";
import { monthlyEquivalent, nextOccurrence, recurringBurden } from "./recurrence";

describe("recurrence calculations", () => {
  it("preserves end-of-month behavior", () => {
    expect(nextOccurrence("2026-01-31", "monthly")).toBe("2026-02-28");
  });

  it("normalizes different cadences", () => {
    expect(monthlyEquivalent(120000, "yearly")).toBe(10000);
    expect(monthlyEquivalent(30000, "quarterly")).toBe(10000);
  });

  it("excludes paused bills from monthly burden", () => {
    expect(recurringBurden([
      { id: "1", name: "Active", amountMinor: 1000, currency: "USD", recurrence: "monthly", nextDueOn: "2026-09-01", categoryId: null, autopay: false, status: "active" },
      { id: "2", name: "Paused", amountMinor: 5000, currency: "USD", recurrence: "monthly", nextDueOn: "2026-09-01", categoryId: null, autopay: false, status: "paused" },
    ])).toBe(1000);
  });
});
