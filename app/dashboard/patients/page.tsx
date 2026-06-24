import Link from "next/link";
import { Users, Search } from "lucide-react";
import prisma from "@/lib/prisma";
import { AddPatientButton, DeletePatientButton } from "./patients-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const GENDER_LABEL: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Build a compact page list with ellipsis, e.g. [1, "…", 4, 5, 6, "…", 20].
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

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  let page = Number.parseInt(sp.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { mrNumber: { contains: q } },
          { mobile: { contains: q } },
        ],
      }
    : {};

  const total = await prisma.patient.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) page = totalPages;

  const [patients, doctors, tests, methods] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: { doctor: { select: { name: true } } },
      orderBy: { serial: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.testCatalog.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, rate: true },
    }),
    prisma.paymentMethod.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = (page - 1) * PAGE_SIZE + patients.length;
  const href = (n: number) =>
    `/dashboard/patients?page=${n}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Patients</h1>
          <p className="mt-1 text-ink-muted">
            Register and browse all patient records.
          </p>
        </div>
        <AddPatientButton doctors={doctors} tests={tests} methods={methods} />
      </div>

      {/* Search */}
      <form method="get" className="mt-6 flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, MR number or mobile…"
            className="w-full rounded-lg border border-edge bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-success-soft"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          Search
        </button>
        {q && (
          <Link
            href="/dashboard/patients"
            className="rounded-lg border border-edge px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Count */}
      <div className="mt-8 flex items-center justify-between border-b border-edge pb-2">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-muted">
          <Users className="h-4 w-4" />
          ALL PATIENTS
        </p>
        <span className="text-sm font-semibold text-ink-muted">{total}</span>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
        {total === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-ink-muted">
            {q ? (
              "No patients match your search."
            ) : (
              <>
                No patients registered yet. Click{" "}
                <span className="font-medium text-ink">Add patient</span> to
                register the first one.
              </>
            )}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                    <th className="px-6 py-3">MR NUMBER</th>
                    <th className="px-6 py-3">NAME</th>
                    <th className="px-6 py-3">AGE</th>
                    <th className="px-6 py-3">GENDER</th>
                    <th className="px-6 py-3">DOCTOR</th>
                    <th className="px-6 py-3">MOBILE</th>
                    <th className="px-6 py-3">CNIC</th>
                    <th className="px-6 py-3">REGISTERED</th>
                    <th className="px-6 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id} className="border-b border-edge last:border-0">
                      <td className="px-6 py-4 font-semibold text-brand">
                        {p.mrNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-ink">{p.name}</td>
                      <td className="px-6 py-4 text-ink">{p.age}</td>
                      <td className="px-6 py-4 text-ink">
                        {GENDER_LABEL[p.gender] ?? p.gender}
                      </td>
                      <td className="px-6 py-4 text-ink-muted">
                        {p.doctor?.name ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-ink-muted">
                        {p.mobile ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-ink-muted">
                        {p.cnic ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-ink-muted">
                        {fmtDate(p.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end">
                          <DeletePatientButton id={p.id} name={p.name} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-6 py-4">
              <p className="text-sm text-ink-muted">
                Showing{" "}
                <span className="font-medium text-ink">
                  {firstRow}–{lastRow}
                </span>{" "}
                of <span className="font-medium text-ink">{total}</span> patients
              </p>

              <nav className="flex items-center gap-1">
                <PageLink
                  href={href(page - 1)}
                  disabled={page <= 1}
                  label="Prev"
                />
                {pageItems(page, totalPages).map((it, i) =>
                  it === "…" ? (
                    <span
                      key={`e${i}`}
                      className="px-2 text-sm text-ink-muted"
                    >
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
