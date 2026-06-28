"use client";

import { useState, useTransition } from "react";
import { CalendarDays, TestTube, Undo2, ChevronRight, Printer } from "lucide-react";
import {
  generateTodayReport,
  generateTestReport,
  generateReturnReport,
  type TodayReport,
  type TestReport,
  type ReturnReport,
} from "./actions";
import { printTodayReport, printTestReport, printReturnReport } from "./print-report";
import { formatRs } from "@/lib/format";

type ReportType = "today" | "tests" | "returns";
type ReportResult =
  | { type: "today"; data: TodayReport }
  | { type: "tests"; data: TestReport }
  | { type: "returns"; data: ReturnReport };

const CARDS: {
  id: ReportType;
  icon: React.ElementType;
  title: string;
  desc: string;
}[] = [
  {
    id: "today",
    icon: CalendarDays,
    title: "Today's Report",
    desc: "Patients registered, tests ordered, and total collections for a selected day.",
  },
  {
    id: "tests",
    icon: TestTube,
    title: "Test Report",
    desc: "All tests ordered in a date range, grouped by test name with revenue.",
  },
  {
    id: "returns",
    icon: Undo2,
    title: "Fee Return Report",
    desc: "All patients who received a fee refund within the selected date range.",
  },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayPKT() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(
    new Date(),
  );
}

function offsetDate(baseStr: string, days: number) {
  const d = new Date(`${baseStr}T12:00:00+05:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(d);
}

function firstOfMonth() {
  const t = todayPKT();
  return `${t.slice(0, 7)}-01`;
}

const PRESETS = [
  { label: "Today", getRange: () => { const t = todayPKT(); return [t, t]; } },
  { label: "Yesterday", getRange: () => { const y = offsetDate(todayPKT(), -1); return [y, y]; } },
  { label: "Last 7 days", getRange: () => [offsetDate(todayPKT(), -6), todayPKT()] },
  { label: "Last 30 days", getRange: () => [offsetDate(todayPKT(), -29), todayPKT()] },
  { label: "This month", getRange: () => [firstOfMonth(), todayPKT()] },
];

// ─── Stat card ────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "brand" | "success" | "danger";
}) {
  const valueColor =
    accent === "brand"
      ? "text-brand"
      : accent === "success"
        ? "text-success"
        : accent === "danger"
          ? "text-danger"
          : "text-ink";
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface p-5 shadow-sm ring-1 ring-edge">
      <p className="text-xs font-semibold tracking-wider text-ink-muted">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

// ─── Today's Report result ───────────────────────────────────────────────────

function TodayResult({ data }: { data: TodayReport }) {
  const fmtDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${data.date}T12:00:00+05:00`));

  return (
    <div>
      <p className="mb-4 text-sm text-ink-muted">
        Results for <span className="font-semibold text-ink">{fmtDate}</span>
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="PATIENTS REGISTERED" value={String(data.patientsRegistered)} />
        <Stat label="TESTS ORDERED" value={String(data.testsOrdered)} />
        <Stat
          label="TOTAL COLLECTED"
          value={formatRs(data.totalCollected)}
          accent="success"
        />
        {data.totalRefunded > 0 && (
          <Stat
            label="REFUNDED"
            value={formatRs(data.totalRefunded)}
            accent="danger"
          />
        )}
        <Stat
          label="NET COLLECTED"
          value={formatRs(data.netCollected)}
          accent="brand"
        />
      </div>

      {data.patients.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-muted">
          No patients registered on this date.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                <th className="px-5 py-3">MR</th>
                <th className="px-5 py-3">PATIENT</th>
                <th className="px-5 py-3">DOCTOR</th>
                <th className="px-5 py-3">ITEMS</th>
                <th className="px-5 py-3 text-right">PAID</th>
              </tr>
            </thead>
            <tbody>
              {data.patients.map((p) => (
                <tr key={p.mrNumber} className="border-b border-edge last:border-0">
                  <td className="px-5 py-3 text-xs font-semibold text-brand">
                    {p.mrNumber}
                  </td>
                  <td className="px-5 py-3 font-semibold uppercase text-ink">
                    {p.name}
                  </td>
                  <td className="px-5 py-3 text-sm text-ink-muted">
                    {p.doctor ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.items.length === 0 ? (
                        <span className="text-sm text-ink-muted">—</span>
                      ) : (
                        p.items.map((item, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink ring-1 ring-edge"
                          >
                            {item}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-ink">
                    {formatRs(p.paid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Test Report result ───────────────────────────────────────────────────────

function TestResult({ data }: { data: TestReport }) {
  const fmt = (s: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${s}T12:00:00+05:00`));

  return (
    <div>
      <p className="mb-4 text-sm text-ink-muted">
        Results from{" "}
        <span className="font-semibold text-ink">{fmt(data.from)}</span> to{" "}
        <span className="font-semibold text-ink">{fmt(data.to)}</span>
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="TOTAL TESTS" value={String(data.totalTests)} />
        <Stat
          label="TOTAL REVENUE"
          value={formatRs(data.totalRevenue)}
          accent="success"
        />
        <Stat
          label="UNIQUE TEST TYPES"
          value={String(data.breakdown.length)}
        />
      </div>

      {data.breakdown.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-muted">
          No tests ordered in this period.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                <th className="px-5 py-3">TEST NAME</th>
                <th className="px-5 py-3 text-right">RATE</th>
                <th className="px-5 py-3 text-right">COUNT</th>
                <th className="px-5 py-3 text-right">REVENUE</th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map((row) => (
                <tr key={row.testName} className="border-b border-edge last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{row.testName}</td>
                  <td className="px-5 py-3 text-right text-sm text-ink-muted">
                    {formatRs(row.rate)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-ink">
                    {row.count}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-success">
                    {formatRs(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-edge bg-canvas">
                <td className="px-5 py-3 text-sm font-semibold text-ink" colSpan={2}>
                  Total
                </td>
                <td className="px-5 py-3 text-right font-bold text-ink">
                  {data.totalTests}
                </td>
                <td className="px-5 py-3 text-right font-bold text-success">
                  {formatRs(data.totalRevenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Fee Return Report result ─────────────────────────────────────────────────

function ReturnResult({ data }: { data: ReturnReport }) {
  const fmt = (s: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${s}T12:00:00+05:00`));

  const fmtDT = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));

  return (
    <div>
      <p className="mb-4 text-sm text-ink-muted">
        Results from <span className="font-semibold text-ink">{fmt(data.from)}</span> to{" "}
        <span className="font-semibold text-ink">{fmt(data.to)}</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="TOTAL RETURNS" value={String(data.totalReturns)} />
        <Stat label="TOTAL AMOUNT RETURNED" value={formatRs(data.totalAmount)} accent="danger" />
      </div>

      {data.rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-muted">
          No fee returns in this period.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge text-left text-xs font-semibold tracking-wider text-ink-muted">
                <th className="px-5 py-3">MR #</th>
                <th className="px-5 py-3">PATIENT</th>
                <th className="px-5 py-3 text-right">AMOUNT</th>
                <th className="px-5 py-3 text-right">RETURN DATE</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i} className="border-b border-edge last:border-0">
                  <td className="px-5 py-3 text-xs font-semibold text-brand">{r.mrNumber}</td>
                  <td className="px-5 py-3 font-semibold uppercase text-ink">{r.name}</td>
                  <td className="px-5 py-3 text-right font-semibold text-danger">
                    {formatRs(r.amount)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-ink-muted">
                    {fmtDT(r.refundedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-edge bg-canvas">
                <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-ink">Total</td>
                <td className="px-5 py-3 text-right font-bold text-danger">
                  {formatRs(data.totalAmount)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportsClient() {
  const today = todayPKT();
  const [selected, setSelected] = useState<ReportType | null>(null);
  const [dateStr, setDateStr] = useState(today);
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function selectCard(id: ReportType) {
    setSelected(id);
    setResult(null);
    setError(null);
  }

  function applyPreset(getRange: () => string[]) {
    const [f, t] = getRange();
    setFrom(f);
    setTo(t);
    setResult(null);
  }

  function generate() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      if (selected === "today") {
        const res = await generateTodayReport(dateStr);
        if (res.ok) setResult({ type: "today", data: res.data });
        else setError(res.error);
      } else if (selected === "tests") {
        if (from > to) {
          setError("'Date from' must be before 'date to'.");
          return;
        }
        const res = await generateTestReport(from, to);
        if (res.ok) setResult({ type: "tests", data: res.data });
        else setError(res.error);
      } else if (selected === "returns") {
        if (from > to) {
          setError("'Date from' must be before 'date to'.");
          return;
        }
        const res = await generateReturnReport(from, to);
        if (res.ok) setResult({ type: "returns", data: res.data });
        else setError(res.error);
      }
    });
  }

  const inputClass =
    "rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

  return (
    <div>
      {/* Report cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CARDS.map(({ id, icon: Icon, title, desc }) => {
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectCard(id)}
              className={`flex items-start gap-4 rounded-2xl border p-5 text-left transition ${
                active
                  ? "border-brand bg-success-soft shadow-sm"
                  : "border-edge bg-surface shadow-sm hover:border-brand hover:bg-canvas"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  active ? "bg-brand text-white" : "bg-canvas text-brand"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${active ? "text-brand" : "text-ink"}`}>
                  {title}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">{desc}</p>
              </div>
              <ChevronRight
                className={`mt-1 h-4 w-4 shrink-0 transition ${
                  active ? "text-brand" : "text-ink-muted"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Filters + Generate */}
      {selected && (
        <div className="mt-6 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-edge">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wider text-ink-muted">
                {selected === "today" ? "DATE" : "DATE FROM"}
              </p>
              {selected === "today" ? (
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => { setDateStr(e.target.value); setResult(null); }}
                  className={inputClass}
                />
              ) : (
                <input
                  type="date"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setResult(null); }}
                  className={inputClass}
                />
              )}
            </div>

            {(selected === "tests" || selected === "returns") && (
              <>
                <div>
                  <p className="mb-1.5 text-xs font-semibold tracking-wider text-ink-muted">
                    DATE TO
                  </p>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => { setTo(e.target.value); setResult(null); }}
                    className={inputClass}
                  />
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold tracking-wider text-ink-muted">
                    PERIOD PRESET
                  </p>
                  <select
                    className={inputClass}
                    defaultValue=""
                    onChange={(e) => {
                      const preset = PRESETS.find((p) => p.label === e.target.value);
                      if (preset) applyPreset(preset.getRange);
                    }}
                  >
                    <option value="" disabled>
                      Select preset…
                    </option>
                    {PRESETS.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2 sm:ml-auto">
              {result && (
                <button
                  type="button"
                  onClick={() => {
                    if (result.type === "today") printTodayReport(result.data);
                    else if (result.type === "tests") printTestReport(result.data);
                    else printReturnReport(result.data);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink transition hover:bg-canvas"
                >
                  <Printer className="h-4 w-4" />
                  Print / PDF
                </button>
              )}
              <button
                type="button"
                onClick={generate}
                disabled={pending}
                className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
              >
                {pending ? "Generating…" : "Generate report"}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6">
          {result.type === "today" && <TodayResult data={result.data} />}
          {result.type === "tests" && <TestResult data={result.data} />}
          {result.type === "returns" && <ReturnResult data={result.data} />}
        </div>
      )}
    </div>
  );
}
