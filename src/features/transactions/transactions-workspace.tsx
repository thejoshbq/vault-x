"use client";

import { useState } from "react";
import type { DashboardData } from "@/lib/domain";
import { ReceiptCapture } from "@/features/receipts/receipt-capture";
import { TransactionsView } from "./transactions-view";

export function TransactionsWorkspace({
  data,
  householdId,
  categories,
  startNew,
  startReceipt,
}: {
  data: DashboardData;
  householdId: string | null;
  categories: Array<{ id: string; name: string }>;
  startNew: boolean;
  startReceipt: boolean;
}) {
  const [receiptOpen, setReceiptOpen] = useState(startReceipt);
  return (
    <>
      <TransactionsView
        data={data}
        categories={categories}
        startNew={startNew}
        onScanReceipt={() => setReceiptOpen(true)}
      />
      <ReceiptCapture
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        householdId={householdId}
        accounts={data.accounts}
        categories={categories}
      />
    </>
  );
}
