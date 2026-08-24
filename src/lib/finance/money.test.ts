import { describe, expect, it } from "vitest";
import { formatMoney, percent, toMinorUnits } from "./money";

describe("money utilities", () => {
  it("converts decimal amounts to integer minor units", () => {
    expect(toMinorUnits("12.345")).toBe(1235);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
  });

  it("formats a minor-unit amount", () => {
    expect(formatMoney(123456, "USD")).toBe("$1,234.56");
  });

  it("handles zero denominators in percentages", () => {
    expect(percent(100, 0)).toBe(0);
    expect(percent(50, 200)).toBe(25);
  });
});
