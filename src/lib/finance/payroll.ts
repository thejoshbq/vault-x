/** 2026 employee-side statutory rates for a South Carolina W-2 wage. */
const OASDI_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
const FEDERAL_ADDITIONAL_WAGE_RATE = 0.12;

/** SCDOR WH-1603F 2026, subtraction method, zero allowances. */
const SC_ZERO_BRACKET = 3640;
const SC_MID_BRACKET = 18230;
const SC_MID_RATE = 0.03;
const SC_TOP_RATE = 0.06;
const SC_TOP_BASE_TAX = 437.7;

export function southCarolinaStateWithholdingAnnual(annualWages: number) {
  if (annualWages < SC_ZERO_BRACKET) return 0;
  if (annualWages < SC_MID_BRACKET) return (annualWages - SC_ZERO_BRACKET) * SC_MID_RATE;
  return (annualWages - SC_MID_BRACKET) * SC_TOP_RATE + SC_TOP_BASE_TAX;
}

export function southCarolinaEmployeeTaxes(grossMonthlyMinor: number) {
  const oasdiMinor = Math.round(grossMonthlyMinor * OASDI_RATE);
  const medicareMinor = Math.round(grossMonthlyMinor * MEDICARE_RATE);
  const federalMinor = Math.round(grossMonthlyMinor * FEDERAL_ADDITIONAL_WAGE_RATE);
  const annualWages = (grossMonthlyMinor / 100) * 12;
  const scStateMinor = Math.round((southCarolinaStateWithholdingAnnual(annualWages) / 12) * 100);
  return {
    oasdiMinor,
    medicareMinor,
    federalMinor,
    scStateMinor,
    totalMinor: oasdiMinor + medicareMinor + federalMinor + scStateMinor,
  };
}
