import { DollarSign, Clock } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatRs } from "@/lib/format";
import PaymentsManager, { type MethodView } from "./payments-manager";

export const dynamic = "force-dynamic";

type TransferRow = {
  id: string;
  date: Date;
  fromName: string;
  toName: string;
  amount: number;
  note: string | null;
};

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function TransactionTable({ rows }: { rows: TransferRow[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-y border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
          <th className="px-6 py-3">DATE</th>
          <th className="px-6 py-3">FROM</th>
          <th className="px-6 py-3">TO</th>
          <th className="px-6 py-3">AMOUNT</th>
          <th className="px-6 py-3">NOTE</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-edge last:border-0">
            <td className="px-6 py-4 text-ink-muted">{fmtDate(r.date)}</td>
            <td className="px-6 py-4 font-medium text-ink">{r.fromName}</td>
            <td className="px-6 py-4 font-medium text-ink">{r.toName}</td>
            <td className="px-6 py-4 font-bold text-ink">{formatRs(r.amount)}</td>
            <td className="px-6 py-4 text-ink-muted">{r.note ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function PaymentsPage() {
  const [methods, transfers, paymentSums] = await Promise.all([
    prisma.paymentMethod.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.transfer.findMany({
      include: { from: true, to: true },
      orderBy: { date: "desc" },
    }),
    prisma.payment.groupBy({
      by: ["paymentMethodId"],
      where: { refundedAt: null },
      _sum: { amount: true },
    }),
  ]);

  // Running balance = opening + patient payments in + transfers in − transfers out.
  const balance = new Map<string, number>();
  for (const m of methods) balance.set(m.id, m.openingBalance);
  for (const p of paymentSums) {
    balance.set(
      p.paymentMethodId,
      (balance.get(p.paymentMethodId) ?? 0) + (p._sum.amount ?? 0),
    );
  }
  for (const t of transfers) {
    balance.set(t.toId, (balance.get(t.toId) ?? 0) + t.amount);
    balance.set(t.fromId, (balance.get(t.fromId) ?? 0) - t.amount);
  }

  const methodViews: MethodView[] = methods.map((m) => ({
    id: m.id,
    name: m.name,
    openingBalance: m.openingBalance,
    currentBalance: balance.get(m.id) ?? m.openingBalance,
  }));

  const rows: TransferRow[] = transfers.map((t) => ({
    id: t.id,
    date: t.date,
    fromName: t.from.name,
    toName: t.to.name,
    amount: t.amount,
    note: t.note,
  }));

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayRows = rows.filter((r) => r.date >= startOfToday);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-ink">Payment Methods</h1>
      <p className="mt-1 max-w-3xl text-ink-muted">
        Configure the cash, wallet and bank channels available across invoices,
        cashbook and supplier payments. Each method tracks its own running
        balance starting from the opening you enter.
      </p>

      <PaymentsManager methods={methodViews} />

      {/* Today's transactions */}
      <section className="mt-10">
        <div className="flex items-center justify-between border-b border-edge pb-2">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-muted">
            <DollarSign className="h-4 w-4" />
            TODAY&apos;S TRANSACTIONS
          </p>
          <span className="text-sm font-semibold text-ink-muted">
            {todayRows.length}
          </span>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
          {todayRows.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-ink-muted">
              No transactions today yet.
            </p>
          ) : (
            <TransactionTable rows={todayRows} />
          )}
        </div>
      </section>

      {/* All transactions */}
      <section className="mt-10">
        <div className="flex items-center justify-between border-b border-edge pb-2">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-muted">
            <Clock className="h-4 w-4" />
            TRANSACTIONS
          </p>
          <span className="text-sm font-semibold text-ink-muted">
            {rows.length}
          </span>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
          {rows.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-ink-muted">
              No transactions recorded yet.
            </p>
          ) : (
            <>
              <TransactionTable rows={rows} />
              <p className="border-t border-edge px-6 py-4 text-sm text-ink-muted">
                Showing <span className="font-medium text-ink">1–{rows.length}</span> of{" "}
                <span className="font-medium text-ink">{rows.length}</span> transactions
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
