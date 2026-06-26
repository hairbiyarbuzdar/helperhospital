import Link from "next/link";
import { Undo2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatRs } from "@/lib/format";
import { pageItems } from "@/lib/pagination";
import { ReturnByMrForm, RefundButton } from "./returns-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  let page = Number.parseInt(sp.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  const total = await prisma.payment.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) page = totalPages;

  const payments = await prisma.payment.findMany({
    include: { patient: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const href = (n: number) => `/dashboard/returns?page=${n}`;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-ink">Fee Return</h1>
      <p className="mt-1 text-ink-muted">
        Enter a patient&apos;s MR number to return their collected fee.
      </p>

      {/* MR search + return */}
      <div className="mt-6 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-edge">
        <ReturnByMrForm />
      </div>

      {/* Recent payments */}
      <div className="mt-8 flex items-center justify-between border-b border-edge pb-2">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-muted">
          <Undo2 className="h-4 w-4" />
          RECENT TEST PAYMENTS
        </p>
        <span className="text-sm font-semibold text-ink-muted">{total}</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
        {total === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-ink-muted">
            No test payments yet. Patients who pay for tests at registration
            will appear here.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                    <th className="px-6 py-3">PATIENT</th>
                    <th className="px-6 py-3">AMOUNT</th>
                    <th className="px-6 py-3">DATE</th>
                    <th className="px-6 py-3">STATUS</th>
                    <th className="px-6 py-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const refunded = p.refundedAt != null;
                    const label = `${p.patient.name} (${p.patient.mrNumber})`;
                    return (
                      <tr key={p.id} className="border-b border-edge last:border-0">
                        <td className="px-6 py-4">
                          <p className="font-medium text-ink">{p.patient.name}</p>
                          <p className="text-xs font-semibold text-brand">
                            {p.patient.mrNumber}
                          </p>
                        </td>
                        <td className="px-6 py-4 font-semibold text-ink">
                          {formatRs(p.amount)}
                        </td>
                        <td className="px-6 py-4 text-ink-muted">
                          {fmtDate(p.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              refunded
                                ? "bg-danger-soft text-danger"
                                : "bg-success-soft text-success"
                            }`}
                          >
                            {refunded ? "Refunded" : "Paid"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end">
                            {refunded ? (
                              <span className="text-sm text-ink-muted">—</span>
                            ) : (
                              <RefundButton paymentId={p.id} label={label} amount={p.amount} />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-6 py-4">
              <p className="text-sm text-ink-muted">
                <span className="font-medium text-ink">{total}</span> payment
                {total === 1 ? "" : "s"}
              </p>
              <nav className="flex items-center gap-1">
                <PageLink href={href(page - 1)} disabled={page <= 1} label="Prev" />
                {pageItems(page, totalPages).map((it, i) =>
                  it === "…" ? (
                    <span key={`e${i}`} className="px-2 text-sm text-ink-muted">
                      …
                    </span>
                  ) : (
                    <Link
                      key={it}
                      href={href(it)}
                      aria-current={it === page ? "page" : undefined}
                      className={`min-w-9 rounded-lg px-3 py-1.5 text-center text-sm font-medium transition ${
                        it === page
                          ? "bg-brand text-white"
                          : "border border-edge text-ink hover:bg-canvas"
                      }`}
                    >
                      {it}
                    </Link>
                  ),
                )}
                <PageLink
                  href={href(page + 1)}
                  disabled={page >= totalPages}
                  label="Next"
                />
              </nav>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg border border-edge px-3 py-1.5 text-sm font-medium text-ink-muted opacity-50">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-edge px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-canvas"
    >
      {label}
    </Link>
  );
}
