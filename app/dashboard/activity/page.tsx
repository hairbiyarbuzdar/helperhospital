import Link from "next/link";
import { History, Search } from "lucide-react";
import prisma from "@/lib/prisma";
import { pageItems } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  let page = Number.parseInt(sp.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  const where = q ? { mrNumber: { contains: q } } : {};

  const total = await prisma.activityLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) page = totalPages;

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const href = (n: number) =>
    `/dashboard/activity?page=${n}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-ink">Activity Log</h1>
      <p className="mt-1 text-ink-muted">
        A record of actions taken — search by MR number to see who created a
        patient or ordered their tests.
      </p>

      {/* Search */}
      <form method="get" className="mt-6 flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by MR number…"
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
            href="/dashboard/activity"
            className="rounded-lg border border-edge px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 flex items-center justify-between border-b border-edge pb-2">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-muted">
          <History className="h-4 w-4" />
          {q ? `ACTIVITIES FOR MR ${q}` : "RECENT ACTIVITY"}
        </p>
        <span className="text-sm font-semibold text-ink-muted">{total}</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
        {total === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-ink-muted">
            {q ? "No activity found for that MR number." : "No activity yet."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                    <th className="px-6 py-3">WHEN</th>
                    <th className="px-6 py-3">ACTIVITY</th>
                    <th className="px-6 py-3">MR</th>
                    <th className="px-6 py-3">BY</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-edge last:border-0">
                      <td className="px-6 py-4 text-ink-muted">
                        {dateTimeFmt.format(l.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-ink">{l.description}</td>
                      <td className="px-6 py-4 font-semibold text-brand">
                        {l.mrNumber ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-ink">{l.userName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-6 py-4">
              <p className="text-sm text-ink-muted">
                <span className="font-medium text-ink">{total}</span>{" "}
                {total === 1 ? "entry" : "entries"}
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
