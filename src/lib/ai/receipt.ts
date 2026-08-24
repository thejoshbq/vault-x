import { z } from "zod";

const confidence = z.number().min(0).max(1);

export const receiptExtractionSchema = z.object({
  merchant: z.string().min(1).max(160),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3).default("USD"),
  subtotalMinor: z.number().int().nonnegative().nullable(),
  taxMinor: z.number().int().nonnegative().nullable(),
  totalMinor: z.number().int().positive(),
  paymentHint: z.string().max(80).nullable(),
  categorySuggestion: z.string().max(60).nullable(),
  confidence: z.object({
    merchant: confidence,
    occurredOn: confidence,
    total: confidence,
    overall: confidence,
  }),
  items: z.array(
    z.object({
      description: z.string().min(1).max(300),
      quantity: z.number().positive().nullable(),
      unitPriceMinor: z.number().int().nonnegative().nullable(),
      totalMinor: z.number().int().nonnegative(),
      confidence,
    }),
  ).max(200),
});

export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;

export interface ReceiptExtractor {
  extract(input: { bytes: Uint8Array; mimeType: string }): Promise<ReceiptExtraction>;
}

export function validateReceiptExtraction(value: unknown) {
  const extraction = receiptExtractionSchema.parse(value);
  const itemTotal = extraction.items.reduce((sum, item) => sum + item.totalMinor, 0);
  const tolerance = Math.max(2, Math.round(extraction.totalMinor * 0.02));
  return {
    ...extraction,
    totalsReconcile: Math.abs(itemTotal - extraction.totalMinor) <= tolerance,
  };
}
