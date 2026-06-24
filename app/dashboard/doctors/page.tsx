import Link from "next/link";
import { Stethoscope } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatRs } from "@/lib/format";
import { AddDoctorButton, DeleteDoctorButton } from "./doctors-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function pageItems(current: number, total: number): (number | "…")[] {
  const set = new Set<number>();
  for (const n of [1, total, current - 1, current, current + 1]) {
    if (n >= 1 && n <= total) set.add(n);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  let page = Number.parseInt(sp.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  const total = await prisma.doctor.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) page = totalPages;

  const doctors = await prisma.doctor.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = (page - 1) * PAGE_SIZE + doctors.length;
  const href = (n: number) => `/dashboard/doctors?page=${n}`;

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Doctors</h1>
          <p className="mt-1 text-ink-muted">
            Manage doctors, specialties and consultation fees.
          </p>
        </div>
        <AddDoctorButton />
      </div>

      <div className="mt-8 flex items-center justify-between border-b border-edge pb-2">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-muted">
          <Stethoscope className="h-4 w-4" />
          ALL DOCTORS
        </p>
        <span className="text-sm font-semibold text-ink-muted">{total}</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
        {total === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-ink-muted">
            No doctors added yet. Click{" "}
            <span className="font-medium text-ink">Add doctor</span> to add the
            first one.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                    <th className="px-6 py-3">NAME</th>
                    <th className="px-6 py-3">SPECIALTY</th>
                    <th className="px-6 py-3">QUALIFICATION</th>
                    <th className="px-6 py-3">MOBILE</th>
                    <th className="px-6 py-3">EMAIL</th>
                    <th className="px-6 py-3">FEE</th>
                    <th className="px-6 py-3">STATUS</th>
                    <th className="px-6 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((d) => (
                    <tr key={d.id} className="border-b border-edge last:border-0">
                      <td className="px-6 py-4 font-medium text-ink">{d.name}</td>
                      <td className="px-6 py-4 text-ink">{d.specialty ?? "—"}</td>
                      <td className="px-6 py-4 text-ink-muted">
                        {d.qualification ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-ink-muted">{d.mobile ?? "—"}</td>
                      <td className="px-6 py-4 text-ink-muted">{d.email ?? "—"}</td>
                      <td className="px-6 py-4 text-ink">
                        {d.fee != null ? formatRs(d.fee) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            d.isActive
                              ? "bg-success-soft text-success"
                              : "bg-warning-soft text-warning"
                          }`}
                        >
                          {d.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end">
                          <DeleteDoctorButton id={d.id} name={d.name} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-6 py-4">
              <p className="text-sm text-ink-muted">
                Showing{" "}
                <span className="font-medium text-ink">
                  {firstRow}–{lastRow}
                </span>{" "}
                of <span className="font-medium text-ink">{total}</span> doctors
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
                <PageLink href={href(page + 1)} disabled={page >= totalPages} label="Next" />
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
