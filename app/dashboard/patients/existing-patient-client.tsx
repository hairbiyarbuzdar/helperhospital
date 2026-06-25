"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { UserSearch, Search, X, Check } from "lucide-react";
import { formatRs } from "@/lib/format";
import {
  searchPatients,
  chargeExistingPatient,
  type PatientHit,
} from "./actions";
import type { TestOption, MethodOption } from "./patients-client";
import Modal from "../_components/modal";

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

type Row = { key: number; testId: string; rate: string };

function PatientCombobox({
  selected,
  onSelect,
  onClear,
}: {
  selected: PatientHit | null;
  onSelect: (p: PatientHit) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientHit[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selected) return;
    let active = true;
    const t = setTimeout(async () => {
      const res = await searchPatients(query);
      if (active) setResults(res);
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, selected]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-edge bg-canvas px-3 py-2.5">
        <span className="text-sm text-ink">
          <span className="font-semibold text-brand">MR {selected.mrNumber}</span>{" "}
          · {selected.name}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-brand hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-muted" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search patient by MR number or name…"
        className={`${fieldClass} pl-9`}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-edge bg-surface shadow-lg">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-canvas"
              >
                <span className="font-semibold text-brand">MR {p.mrNumber}</span>
                <span className="text-ink">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-ink-muted shadow-lg">
          No patients found.
        </p>
      )}
    </div>
  );
}

function ChargeForm({
  tests,
  methods,
  onDone,
}: {
  tests: TestOption[];
  methods: MethodOption[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<PatientHit | null>(null);
  const [rows, setRows] = useState<Row[]>(() => [
    { key: 0, testId: "", rate: "" },
  ]);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const keyRef = useRef(0);

  const testMap = new Map(tests.map((t) => [t.id, t]));
  const total = rows.reduce((s, r) => s + (parseInt(r.rate, 10) || 0), 0);
  const chosen = rows.filter((r) => r.testId);

  function removeRow(key: number) {
    setRows((r) => {
      const next = r.filter((x) => x.key !== key);
      return next.length
        ? next
        : [{ key: ++keyRef.current, testId: "", rate: "" }];
    });
  }
  function setTest(key: number, testId: string) {
    const rate = testMap.get(testId)?.rate;
    setRows((r) => {
      const next = r.map((x) =>
        x.key === key
          ? { ...x, testId, rate: rate != null ? String(rate) : x.rate }
          : x,
      );
      const last = next[next.length - 1];
      if (testId && last.key === key) {
        next.push({ key: ++keyRef.current, testId: "", rate: "" });
      }
      return next;
    });
  }
  function setRate(key: number, rate: string) {
    setRows((r) =>
      r.map((x) => (x.key === key ? { ...x, rate: rate.replace(/\D/g, "") } : x)),
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    if (!selected) {
      setError("Select a patient first.");
      return;
    }
    if (chosen.length === 0) {
      setError("Add at least one test.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await chargeExistingPatient({
        patientId: selected.id,
        paymentMethodId: String(fd.get("paymentMethodId") ?? ""),
        items: chosen.map((r) => ({
          testId: r.testId,
          rate: parseInt(r.rate, 10) || 0,
        })),
      });
      if (res?.ok) onDone();
      else setError(res?.error ?? "Something went wrong.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Patient picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink">Patient</label>
        <PatientCombobox
          selected={selected}
          onSelect={setSelected}
          onClear={() => setSelected(null)}
        />
      </div>

      {/* Tests */}
      <div className="border-t border-edge pt-4">
        <p className="text-sm font-semibold text-ink">Tests</p>
        {tests.length === 0 && (
          <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            No tests in the catalog yet — add some in the Tests module first.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_6rem_auto] items-center gap-2"
            >
              <select
                value={row.testId}
                onChange={(e) => setTest(row.key, e.target.value)}
                className={fieldClass}
              >
                <option value="" disabled>
                  Select test
                </option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({formatRs(t.rate)})
                  </option>
                ))}
              </select>
              <input
                value={row.rate}
                onChange={(e) => setRate(row.key, e.target.value)}
                inputMode="numeric"
                placeholder="Rate"
                title="Rate (editable for discount)"
                className={`${fieldClass} text-right`}
              />
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="rounded-md p-2 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Summary + payment */}
      <div className="grid gap-4 sm:grid-cols-2">
        {chosen.length > 0 && (
          <div className="rounded-xl border border-edge bg-canvas p-4">
            <p className="text-xs font-semibold tracking-wider text-ink-muted">
              SUMMARY
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {chosen.map((r) => (
                <li key={r.key} className="flex justify-between text-sm">
                  <span className="text-ink">{testMap.get(r.testId)?.name}</span>
                  <span className="font-medium text-ink">
                    {formatRs(parseInt(r.rate, 10) || 0)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-edge pt-2 text-sm font-semibold">
              <span className="text-ink">Total</span>
              <span className="text-brand">{formatRs(total)}</span>
            </div>
          </div>
        )}

        {total > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="paymentMethodId" className="text-sm font-medium text-ink">
              Pay via
            </label>
            <select id="paymentMethodId" name="paymentMethodId" defaultValue="" className={fieldClass}>
              <option value="" disabled>
                Select payment method
              </option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {methods.length === 0 && (
              <p className="text-xs text-warning">
                No payment methods yet — add one in the Payments module.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-edge px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {pending
            ? "Saving…"
            : total > 0
              ? `Collect ${formatRs(total)}`
              : "Add tests"}
        </button>
      </div>
    </form>
  );
}

export function ExistingPatientButton({
  tests,
  methods,
}: {
  tests: TestOption[];
  methods: MethodOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-edge bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas"
      >
        <UserSearch className="h-4 w-4" />
        Existing patient
      </button>
      {open && (
        <Modal title="Add tests for existing patient" size="xl" onClose={() => setOpen(false)}>
          <ChargeForm tests={tests} methods={methods} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
