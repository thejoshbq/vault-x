"use client";

import { Camera, Check, FileImage, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { DashboardData } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, fromMinorUnits, toMinorUnits } from "@/lib/finance/money";

type Review = {
  id: string;
  merchant: string;
  occurredOn: string;
  totalMinor: number;
  subtotalMinor: number | null;
  taxMinor: number | null;
  currency: DashboardData["currency"];
  categoryId: string | null;
  paymentHint: string | null;
  confidence: { merchant?: number; occurredOn?: number; total?: number; overall?: number };
  items: Array<{ id: string; description: string; totalMinor: number; confidence: number | null }>;
};

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function ReceiptCapture({
  open,
  onClose,
  householdId,
  accounts,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  householdId: string | null;
  accounts: DashboardData["accounts"];
  categories: Array<{ id: string; name: string }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"pick" | "uploading" | "processing" | "review" | "failed">("pick");
  const [progress, setProgress] = useState("Preparing secure upload…");
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [total, setTotal] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const loadReview = useCallback(async (receiptId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const [{ data: receipt }, { data: items }] = await Promise.all([
        supabase.from("receipts").select("*").eq("id", receiptId).single(),
        supabase.from("receipt_items").select("*").eq("receipt_id", receiptId).order("sort_order"),
      ]);
      if (receipt?.status === "failed") throw new Error(receipt.error_message ?? "Extraction failed");
      if (receipt?.status === "needs_review" && receipt.merchant && receipt.occurred_on && receipt.total_minor) {
        const next: Review = {
          id: receipt.id,
          merchant: receipt.merchant,
          occurredOn: receipt.occurred_on,
          totalMinor: receipt.total_minor,
          subtotalMinor: receipt.subtotal_minor,
          taxMinor: receipt.tax_minor,
          currency: receipt.currency as DashboardData["currency"],
          categoryId: receipt.category_id,
          paymentHint: receipt.payment_hint,
          confidence: (receipt.confidence ?? {}) as Review["confidence"],
          items: (items ?? []).map((item) => ({ id: item.id, description: item.description, totalMinor: item.total_minor, confidence: item.confidence })),
        };
        setReview(next);
        setMerchant(next.merchant);
        setDate(next.occurredOn);
        setTotal(fromMinorUnits(next.totalMinor));
        setCategoryId(next.categoryId ?? "");
        setPhase("review");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    throw new Error("Processing is taking longer than expected. Reopen the receipt inbox shortly.");
  }, []);

  async function handleFile(file?: File) {
    if (!file) return;
    if (!allowedTypes.includes(file.type)) return fail("Use a JPEG, PNG, WebP, or PDF receipt.");
    if (file.size > 10 * 1024 * 1024) return fail("Receipt files must be 10 MB or smaller.");
    setError("");
    setPhase("uploading");
    try {
      if (!householdId) {
        setProgress("Reading merchant and totals…");
        await new Promise((resolve) => setTimeout(resolve, 900));
        const demo: Review = {
          id: "demo-receipt",
          merchant: "Green Market",
          occurredOn: new Date().toISOString().slice(0, 10),
          totalMinor: 8634,
          subtotalMinor: 8070,
          taxMinor: 564,
          currency: "USD",
          categoryId: categories[0]?.id ?? null,
          paymentHint: "Visa •••• 4242",
          confidence: { merchant: 0.98, occurredOn: 0.95, total: 0.99, overall: 0.96 },
          items: [
            { id: "demo-1", description: "Produce and pantry", totalMinor: 5234, confidence: 0.91 },
            { id: "demo-2", description: "Household goods", totalMinor: 2836, confidence: 0.88 },
          ],
        };
        setReview(demo); setMerchant(demo.merchant); setDate(demo.occurredOn); setTotal(fromMinorUnits(demo.totalMinor)); setCategoryId(demo.categoryId ?? ""); setPhase("review"); return;
      }
      const supabase = createClient();
      if (!supabase) throw new Error("Cloud storage is not configured.");
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const { data: duplicate } = await supabase.from("receipts").select("id,status").eq("household_id", householdId).eq("content_hash", hash).maybeSingle();
      if (duplicate) throw new Error(`This receipt is already in your inbox (${duplicate.status.replace("_", " ")}).`);
      const receiptId = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
      const path = `${householdId}/${receiptId}/${safeName}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: rowError } = await supabase.from("receipts").insert({
        id: receiptId,
        household_id: householdId,
        storage_path: path,
        status: "uploaded",
        currency: "USD",
        confidence: {},
        content_hash: hash,
      });
      if (rowError) {
        await supabase.storage.from("receipts").remove([path]);
        if (rowError.code === "23505") {
          throw new Error("This receipt is already in your inbox.");
        }
        throw rowError;
      }
      setPhase("processing");
      setProgress("Finding merchant, date, total, and line items…");
      const { error: invokeError } = await supabase.functions.invoke("process-receipt", { body: { receiptId } });
      if (invokeError) throw invokeError;
      await loadReview(receiptId);
    } catch (caught) {
      fail(caught instanceof Error ? caught.message : "Receipt processing failed.");
    }
  }

  function fail(message: string) {
    setError(message);
    setPhase("failed");
  }

  async function confirm() {
    if (!review) return;
    if (review.id === "demo-receipt") {
      toast.success("Receipt confirmed in preview mode.");
      resetAndClose();
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setPhase("processing");
    setProgress("Saving reviewed transaction…");
    const { error: confirmError } = await supabase.rpc("confirm_receipt", {
      target_receipt_id: review.id,
      target_account_id: accountId,
      target_category_id: categoryId || null,
      reviewed_merchant: merchant,
      reviewed_occurred_on: date,
      reviewed_total_minor: toMinorUnits(total),
    });
    if (confirmError) return fail(confirmError.message);
    toast.success("Receipt confirmed and transaction created.");
    resetAndClose();
    window.location.reload();
  }

  function resetAndClose() {
    setPhase("pick"); setReview(null); setError(""); onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 backdrop-blur-sm sm:place-items-center sm:p-5" onClick={resetAndClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="max-h-[95vh] w-full overflow-auto rounded-t-3xl bg-[var(--surface)] p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between"><div><p className="eyebrow">Receipt inbox</p><h2 id="receipt-title" className="mt-1 text-2xl font-black">{phase === "review" ? "Review before saving" : "Scan a receipt"}</h2></div><button aria-label="Close" className="focus-ring grid size-10 place-items-center rounded-xl" onClick={resetAndClose}><X size={19} /></button></div>
        {phase === "pick" && <div className="mt-6"><button className="focus-ring grid min-h-64 w-full place-items-center rounded-3xl border-2 border-dashed border-[var(--line)] bg-[var(--background)] p-8 text-center transition hover:border-[var(--brand)]" onClick={() => inputRef.current?.click()}><span><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]"><Camera size={25} /></span><span className="mt-5 block text-lg font-black">Take a photo or choose a file</span><span className="mt-2 block text-sm leading-6 text-[var(--muted)]">JPEG, PNG, WebP, or PDF · 10 MB maximum</span><span className="button-primary mt-5"><Upload size={16} /> Choose receipt</span></span></button><input ref={inputRef} className="sr-only" type="file" accept={allowedTypes.join(",")} capture="environment" onChange={(event) => handleFile(event.target.files?.[0])} /><p className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck size={14} /> Private upload · You approve every transaction</p></div>}
        {(phase === "uploading" || phase === "processing") && <div className="grid min-h-72 place-items-center text-center"><div><span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]"><FileImage size={26} /><LoaderCircle className="absolute -right-2 -top-2 animate-spin rounded-full bg-[var(--surface)] p-1" size={22} /></span><h3 className="mt-6 text-lg font-black">{phase === "uploading" ? "Uploading securely" : "Vault is reading the receipt"}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{progress}</p></div></div>}
        {phase === "failed" && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center"><h3 className="font-black text-[var(--danger)]">We could not finish this receipt</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{error}</p><button className="button-secondary mt-5" onClick={() => setPhase("pick")}><RefreshCw size={16} /> Try another file</button></div>}
        {phase === "review" && review && <div className="mt-6 space-y-5"><div className="flex items-center justify-between rounded-2xl bg-[var(--brand-soft)] p-4"><div className="flex items-center gap-3"><Sparkles size={18} className="text-[var(--brand-strong)]" /><div><p className="text-sm font-black">Extraction complete</p><p className="mt-0.5 text-xs text-[var(--muted)]">Overall confidence {Math.round((review.confidence.overall ?? 0) * 100)}%</p></div></div><span className="rounded-lg bg-[var(--surface)] px-2 py-1 text-xs font-black">Needs review</span></div><div className="grid gap-4 sm:grid-cols-2"><ReviewField label="Merchant" confidence={review.confidence.merchant}><input className="input" value={merchant} onChange={(event) => setMerchant(event.target.value)} /></ReviewField><ReviewField label="Total" confidence={review.confidence.total}><input className="input" type="number" step="0.01" value={total} onChange={(event) => setTotal(event.target.value)} /></ReviewField><ReviewField label="Date" confidence={review.confidence.occurredOn}><input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></ReviewField><ReviewField label="Account"><select className="input" value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></ReviewField><ReviewField label="Category"><select className="input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></ReviewField><ReviewField label="Payment hint"><input className="input" value={review.paymentHint ?? ""} disabled /></ReviewField></div>{review.items.length > 0 && <div className="rounded-2xl border border-[var(--line)]"><div className="border-b border-[var(--line)] px-4 py-3"><p className="text-sm font-black">Line items</p></div><div className="divide-y divide-[var(--line)]">{review.items.map((item) => <div key={item.id} className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-[var(--muted)]">{item.description}</span><strong>{formatMoney(item.totalMinor, review.currency)}</strong></div>)}</div></div>}<div className="flex justify-end gap-2"><button className="button-secondary" onClick={resetAndClose}>Cancel</button><button className="button-primary" disabled={!accountId || !merchant || !date || !total} onClick={confirm}><Check size={17} /> Confirm transaction</button></div></div>}
      </section>
    </div>
  );
}

function ReviewField({ label, confidence, children }: { label: string; confidence?: number; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center justify-between text-sm font-bold"><span>{label}</span>{confidence !== undefined && <span className={`text-xs ${confidence < 0.8 ? "text-[var(--amber)]" : "text-[var(--muted)]"}`}>{Math.round(confidence * 100)}%</span>}</span>{children}</label>;
}
