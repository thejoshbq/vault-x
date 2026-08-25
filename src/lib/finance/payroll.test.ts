import { describe, expect, it } from "vitest";
import {
  southCarolinaEmployeeTaxes,
  southCarolinaStateWithholdingAnnual,
} from "./payroll";

describe("South Carolina employee tax", () => {
  it("uses the 2026 SCDOR zero-allowance brackets", () => {
    expect(southCarolinaStateWithholdingAnnual(3000)).toBe(0);
    expect(southCarolinaStateWithholdingAnnual(9360)).toBeCloseTo(171.6, 5);
  });

  it("splits Lumber Jill's monthly wages into standard employee taxes", () => {
    const taxes = southCarolinaEmployeeTaxes(78000);
    expect(taxes.oasdiMinor).toBe(4836);
    expect(taxes.medicareMinor).toBe(1131);
    expect(taxes.federalMinor).toBe(9360);
    expect(taxes.scStateMinor).toBe(1430);
    expect(taxes.totalMinor).toBe(16757);
  });
});
