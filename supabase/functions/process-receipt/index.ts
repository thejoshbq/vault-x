import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Extraction = {
  merchant: string;
  occurredOn: string;
  currency: string;
  subtotalMinor: number | null;
  taxMinor: number | null;
  totalMinor: number;
  paymentHint: string | null;
  categorySuggestion: string | null;
  confidence: { merchant: number; occurredOn: number; total: number; overall: number };
  items: Array<{
    description: string;
    quantity: number | null;
    unitPriceMinor: number | null;
    totalMinor: number;
    confidence: number;
  }>;
};

interface VisionProvider {
  extract(dataUrl: string): Promise<Extraction>;
}

class OpenAIReceiptProvider implements VisionProvider {
  async extract(dataUrl: string) {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") ?? "gpt-5-mini",
        instructions:
          "Extract only facts visible on this receipt. Convert all monetary values to integer minor units (cents). Use null when a field is not visible. Never infer a payment card beyond visible last-four digits. Return strict JSON.",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Extract merchant, date, totals, payment hint, likely spending category, field confidence, and line items from this receipt." },
            { type: "input_image", image_url: dataUrl, detail: "high" },
          ],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "receipt_extraction",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["merchant", "occurredOn", "currency", "subtotalMinor", "taxMinor", "totalMinor", "paymentHint", "categorySuggestion", "confidence", "items"],
              properties: {
                merchant: { type: "string" },
                occurredOn: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                currency: { type: "string", minLength: 3, maxLength: 3 },
                subtotalMinor: { type: ["integer", "null"], minimum: 0 },
                taxMinor: { type: ["integer", "null"], minimum: 0 },
                totalMinor: { type: "integer", minimum: 1 },
                paymentHint: { type: ["string", "null"] },
                categorySuggestion: { type: ["string", "null"] },
                confidence: {
                  type: "object",
                  additionalProperties: false,
                  required: ["merchant", "occurredOn", "total", "overall"],
                  properties: {
                    merchant: { type: "number", minimum: 0, maximum: 1 },
                    occurredOn: { type: "number", minimum: 0, maximum: 1 },
                    total: { type: "number", minimum: 0, maximum: 1 },
                    overall: { type: "number", minimum: 0, maximum: 1 },
                  },
                },
                items: {
                  type: "array",
                  maxItems: 200,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["description", "quantity", "unitPriceMinor", "totalMinor", "confidence"],
                    properties: {
                      description: { type: "string" },
                      quantity: { type: ["number", "null"], exclusiveMinimum: 0 },
                      unitPriceMinor: { type: ["integer", "null"], minimum: 0 },
                      totalMinor: { type: "integer", minimum: 0 },
                      confidence: { type: "number", minimum: 0, maximum: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const payload = await response.json();
    const outputText = payload.output_text ??
      payload.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? []).find((item: { text?: string }) => item.text)?.text;
    if (!outputText) throw new Error("AI provider returned no structured output");
    return JSON.parse(outputText) as Extraction;
  }
}

function getProvider(): VisionProvider {
  const provider = Deno.env.get("AI_PROVIDER") ?? "openai";
  if (provider === "openai") return new OpenAIReceiptProvider();
  throw new Error(`Unsupported AI provider: ${provider}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders });
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let receiptId: string | undefined;
  try {
    ({ receiptId } = await request.json());
    if (!receiptId) throw new Error("receiptId is required");
    const { data: authorizedReceipt } = await userClient
      .from("receipts")
      .select("id")
      .eq("id", receiptId)
      .maybeSingle();
    if (!authorizedReceipt) {
      return Response.json({ error: "Receipt not found" }, { status: 404, headers: corsHeaders });
    }
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", receiptId)
      .single();
    if (receiptError || !receipt) throw new Error("Receipt not found");
    if (!["uploaded", "failed"].includes(receipt.status)) {
      return Response.json({ status: receipt.status }, { headers: corsHeaders });
    }
    await supabase.from("receipts").update({ status: "processing", error_message: null }).eq("id", receiptId);
    const { data: file, error: storageError } = await supabase.storage.from("receipts").download(receipt.storage_path);
    if (storageError || !file) throw new Error("Receipt file could not be read");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    const dataUrl = `data:${file.type || "image/jpeg"};base64,${btoa(binary)}`;
    const extraction = await getProvider().extract(dataUrl);
    if (!extraction.merchant || !extraction.occurredOn || extraction.totalMinor <= 0) {
      throw new Error("Receipt extraction did not contain required fields");
    }
    const { data: categories } = await supabase
      .from("categories")
      .select("id,name")
      .eq("household_id", receipt.household_id)
      .eq("kind", "expense");
    const category = categories?.find((item) =>
      extraction.categorySuggestion &&
      (item.name.toLowerCase().includes(extraction.categorySuggestion.toLowerCase()) ||
        extraction.categorySuggestion.toLowerCase().includes(item.name.toLowerCase())),
    );
    await supabase.from("receipt_items").delete().eq("receipt_id", receiptId);
    if (extraction.items.length) {
      const { error: itemError } = await supabase.from("receipt_items").insert(
        extraction.items.map((item, index) => ({
          household_id: receipt.household_id,
          receipt_id: receiptId,
          description: item.description.slice(0, 300),
          quantity: item.quantity,
          unit_price_minor: item.unitPriceMinor,
          total_minor: item.totalMinor,
          confidence: item.confidence,
          sort_order: index,
        })),
      );
      if (itemError) throw itemError;
    }
    const { error: updateError } = await supabase.from("receipts").update({
      status: "needs_review",
      merchant: extraction.merchant.slice(0, 160),
      occurred_on: extraction.occurredOn,
      subtotal_minor: extraction.subtotalMinor,
      tax_minor: extraction.taxMinor,
      total_minor: extraction.totalMinor,
      currency: extraction.currency.toUpperCase(),
      category_id: category?.id ?? null,
      payment_hint: extraction.paymentHint?.slice(0, 80) ?? null,
      confidence: extraction.confidence,
    }).eq("id", receiptId);
    if (updateError) throw updateError;
    return Response.json({ status: "needs_review" }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Receipt processing failed";
    console.error("receipt processing failed", { receiptId, message });
    if (receiptId) {
      await supabase.from("receipts").update({
        status: "failed",
        error_message: "We could not read this receipt. Try a clearer image or enter the transaction manually.",
      }).eq("id", receiptId);
    }
    return Response.json(
      { error: "Receipt processing failed" },
      { status: 500, headers: corsHeaders },
    );
  }
});
