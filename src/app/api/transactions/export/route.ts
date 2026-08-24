import { getDashboardData } from "@/lib/data/dashboard";

function csvCell(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const data = await getDashboardData();
  const rows = [
    ["Date", "Merchant", "Type", "Amount", "Currency", "Note"],
    ...data.transactions.map((transaction) => [
      transaction.occurredOn,
      transaction.merchant,
      transaction.kind,
      (transaction.amountMinor / 100).toFixed(2),
      transaction.currency,
      transaction.note ?? "",
    ]),
  ];
  return new Response(rows.map((row) => row.map(csvCell).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vault-x-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
