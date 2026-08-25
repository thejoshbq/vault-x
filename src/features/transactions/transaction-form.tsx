"use client";

import { LoaderCircle, Plus, X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { DashboardData } from "@/lib/domain";
import { createTransaction, type MutationState } from "./actions";

const initialState: MutationState = {};

export function TransactionForm({
  accounts,
  categories,
  incomeSources,
  open,
  onClose,
}: {
  accounts: DashboardData["accounts"];
  categories: Array<{ id: string; name: string }>;
  incomeSources: DashboardData["incomeSources"];
  open: boolean;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(createTransaction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
      onClose();
    }
    if (state.status === "error") toast.error(state.message);
  }, [state, onClose]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 backdrop-blur-sm sm:place-items-center sm:p-5" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="transaction-form-title" className="max-h-[94vh] w-full overflow-auto rounded-t-3xl bg-[var(--surface)] p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div><p className="eyebrow">New activity</p><h2 id="transaction-form-title" className="mt-1 text-2xl font-black">Add a transaction</h2></div>
          <button type="button" aria-label="Close" className="focus-ring grid size-10 place-items-center rounded-xl" onClick={onClose}><X size={19} /></button>
        </div>
        <form ref={formRef} action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-bold">Type</span><select className="input" name="kind" defaultValue="expense"><option value="expense">Expense</option><option value="income">Income</option></select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-bold">Amount</span><input className="input" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" required /></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Merchant or source</span><input className="input" name="merchant" maxLength={160} placeholder="Where did the money move?" required /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-bold">Account</span><select className="input" name="accountId" required>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-bold">Date</span><input className="input" name="occurredOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Category</span><select className="input" name="categoryId" defaultValue=""><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Income source <span className="font-normal text-[var(--muted)]">(for deposits)</span></span><select className="input" name="incomeSourceId" defaultValue=""><option value="">Not an income deposit</option>{incomeSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">Note <span className="font-normal text-[var(--muted)]">(optional)</span></span><textarea className="input min-h-24 resize-y" name="note" maxLength={1000} placeholder="Add useful context" /></label>
          <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
            <button className="button-primary" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />} Add transaction</button>
          </div>
        </form>
      </section>
    </div>
  );
}
