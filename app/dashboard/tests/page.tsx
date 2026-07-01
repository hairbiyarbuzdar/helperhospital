import Link from "next/link";
import { Search } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatRs } from "@/lib/format";
import { pageItems } from "@/lib/pagination";
import { AddCatalogButton, DeleteCatalogButton } from "./catalog-client";
import {
  OrderTestButton,
  UpdateTestButton,
  DeleteTestButton,
  PrintTestButton,
  type OrderView,
} from "./patient-tests-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function Tabs({ active }: { active: "orders" | "catalog" }) {
  const tab = (key: "orders" | "catalog", label: string) => (
    <Link
      href={`/dashboard/tests?tab=${key}`}
      className={`border-b-2 px-1 pb-3 text-sm font-semibold transition ${
        active === key
          ? "border-brand text-brand"
          : "border-transparent text-ink-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mt-6 flex gap-6 border-b border-edge">
      {tab("orders", "Patient Tests")}
      {tab("catalog", "Test Catalog")}
    </div>
  );
}

function PaginationNav({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (n: number) => string;
}) {
  return (
    <nav className="flex items-center gap-1">
      <PageLink href={makeHref(page - 1)} disabled={page <= 1} label="Prev" />
      {pageItems(page, totalPages).map((it, i) =>
        it === "…" ? (
          <span key={`e${i}`} className="px-2 text-sm text-ink-muted">
            …
          </span>
        ) : (
          <Link
            key={it}
            href={makeHref(it)}
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
      <PageLink href={makeHref(page + 1)} disabled={page >= totalPages} label="Next" />
    </nav>
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

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "catalog" ? "catalog" : "orders";
  const q = (sp.q ?? "").trim();
  let page = Number.parseInt(sp.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Tests</h1>
          <p className="mt-1 text-ink-muted">
            Order tests for patients and manage your test catalogue.
          </p>
        </div>
        {tab === "catalog" ? <AddCatalogButton /> : <OrderTabButton />}
      </div>

      <Tabs active={tab} />

      {tab === "catalog" ? (
        <CatalogTab page={page} />
      ) : (
        <OrderTab page={page} q={q} />
      )}
    </div>
  );
}

/* ------------------------------ Catalog tab ----------------------------- */

async function CatalogTab({ page }: { page: number }) {
  const total = await prisma.testCatalog.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);

  const tests = await prisma.testCatalog.findMany({
    orderBy: { name: "asc" },
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const makeHref = (n: number) => `/dashboard/tests?tab=catalog&page=${n}`;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
      {total === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-ink-muted">
          No tests in the catalog yet. Click{" "}
          <span className="font-medium text-ink">Add test</span> to create one.
        </p>
      ) : (
        <>
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                <th className="px-6 py-3">TEST NAME</th>
                <th className="px-6 py-3">RATE</th>
                <th className="px-6 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-b border-edge last:border-0">
                  <td className="px-6 py-4 font-medium text-ink">{t.name}</td>
                  <td className="px-6 py-4 font-semibold text-ink">
                    {formatRs(t.rate)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end">
                      <DeleteCatalogButton id={t.id} name={t.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-6 py-4">
            <p className="text-sm text-ink-muted">
              <span className="font-medium text-ink">{total}</span> test
              {total === 1 ? "" : "s"} in catalog
            </p>
            <PaginationNav page={current} totalPages={totalPages} makeHref={makeHref} />
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------- Patient tests tab -------------------------- */

async function OrderTabButton() {
  const [patients, tests] = await Promise.all([
    // Only patients who have no tests ordered yet.
    prisma.patient.findMany({
      where: { tests: { none: {} } },
      orderBy: { serial: "desc" },
      select: { id: true, name: true, mrNumber: true },
    }),
    prisma.testCatalog.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, rate: true },
    }),
  ]);

  return (
    <OrderTestButton
      patients={patients.map((p) => ({
        id: p.id,
        label: `${p.mrNumber ?? "—"} · ${p.name}`,
      }))}
      tests={tests}
    />
  );
}

async function OrderTab({ page, q }: { page: number; q: string }) {
  const where = q
    ? {
        patient: {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { mrNumber: { contains: q, mode: "insensitive" as const } },
          ],
        },
      }
    : {};

  const total = await prisma.patientTest.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);

  const orders = await prisma.patientTest.findMany({
    where,
    include: { patient: true },
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const makeHref = (n: number) =>
    `/dashboard/tests?tab=orders&page=${n}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="mt-6">
      {/* Search */}
      <form method="get" className="mb-4 flex max-w-md gap-2">
        <input type="hidden" name="tab" value="orders" />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Filter by patient name or MR number…"
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
            href="/dashboard/tests?tab=orders"
            className="rounded-lg border border-edge px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
        {total === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-ink-muted">
            {q
              ? "No test orders match your search."
              : "No tests ordered yet. Click New test to add one."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                    <th className="px-6 py-3">MR NUMBER</th>
                    <th className="px-6 py-3">NAME</th>
                    <th className="px-6 py-3">TEST</th>
                    <th className="px-6 py-3">RATE</th>
                    <th className="px-6 py-3">DATE</th>
                    <th className="px-6 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const patientLabel = `${o.patient.mrNumber ?? "—"} · ${o.patient.name}`;
                    const view: OrderView = {
                      id: o.id,
                      patientId: o.patientId,
                      patientLabel,
                      testName: o.testName,
                      rate: o.rate,
                      status: o.status,
                      payment: o.payment,
                      result: o.result,
                    };
                    return (
                      <tr key={o.id} className="border-b border-edge last:border-0">
                        <td className="px-6 py-4 font-semibold text-brand">{o.patient.mrNumber ?? "—"}</td>
                        <td className="px-6 py-4 font-bold uppercase text-ink">{o.patient.name}</td>
                        <td className="px-6 py-4 text-ink">{o.testName}</td>
                        <td className="px-6 py-4 font-semibold text-ink">
                          {formatRs(o.rate)}
                        </td>
                        <td className="px-6 py-4 text-ink-muted">
                          {fmtDate(o.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1">
                            <PrintTestButton patientId={o.patientId} />
                            <UpdateTestButton order={view} />
                            <DeleteTestButton id={o.id} label={o.testName} />
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
                <span className="font-medium text-ink">{total}</span> test order
                {total === 1 ? "" : "s"}
              </p>
              <PaginationNav page={current} totalPages={totalPages} makeHref={makeHref} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
