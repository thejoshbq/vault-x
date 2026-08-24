import { describe, expect, it } from "vitest";
import { receiptExtractionSchema, validateReceiptExtraction } from "./receipt";

const extraction = {
  merchant: "Green Market",
  occurredOn: "2026-08-24",
  currency: "USD",
  subtotalMinor: 1000,
  taxMinor: 80,
  totalMinor: 1080,
  paymentHint: "Visa 4242",
  categorySuggestion: "Groceries",
  confidence: { merchant: 0.99, occurredOn: 0.9, total: 0.98, overall: 0.95 },
  items: [{ description: "Food", quantity: 1, unitPriceMinor: 1000, totalMinor: 1080, confidence: 0.9 }],
};

describe("receipt extraction contract", () => {
  it("accepts strict minor-unit extraction", () => {
    expect(receiptExtractionSchema.parse(extraction).totalMinor).toBe(1080);
    expect(validateReceiptExtraction(extraction).totalsReconcile).toBe(true);
  });

  it("rejects invalid confidence and non-positive totals", () => {
    expect(() => receiptExtractionSchema.parse({ ...extraction, totalMinor: 0 })).toThrow();
    expect(() => receiptExtractionSchema.parse({
      ...extraction,
      confidence: { ...extraction.confidence, overall: 2 },
    })).toThrow();
  });
});
