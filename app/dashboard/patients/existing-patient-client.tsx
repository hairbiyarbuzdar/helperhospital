"use client";

import { useEffect, useState, useTransition } from "react";
import { UserSearch, Search, Check } from "lucide-react";
import { formatRs } from "@/lib/format";
import {
  searchPatients,
  chargeExistingPatient,
  type PatientHit,
} from "./actions";
import LineItems, { type CatalogOption, type ChosenItem } from "./line-items";
import { openSlipWindow, writeSlip } from "./print-slip";
import type { TestOption, FeeOption } from "./patients-client";
import Modal from "../_components/modal";

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

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
  fees,
  onDone,
}: {
  tests: TestOption[];
  fees: FeeOption[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<PatientHit | null>(null);
  const [testItems, setTestItems] = useState<ChosenItem[]>([]);
  const [consultItems, setConsultItems] = useState<ChosenItem[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const testMap = new Map<string, CatalogOption>(tests.map((t) => [t.id, t]));
  const feeMap = new Map<string, CatalogOption>(fees.map((f) => [f.id, f]));

  const summary = [
    ...testItems.map((i) => ({
      name: testMap.get(i.id)?.name ?? "Test",
      rate: i.rate,
    })),
    ...consultItems.map((i) => ({
      name: feeMap.get(i.id)?.name ?? "Consultation",
      rate: i.rate,
    })),
  ];
  const total = summary.reduce((s, r) => s + r.rate, 0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    if (!selected) {
      setError("Select a patient first.");
      return;
    }
    if (summary.length === 0) {
      setError("Add at least one test or consultation fee.");
      return;
    }
    const win = openSlipWindow();
    startTransition(async () => {
      const res = await chargeExistingPatient({
        patientId: selected.id,
        items: testItems.map((i) => ({ testId: i.id, rate: i.rate })),
        consultations: consultItems.map((i) => ({ feeId: i.id, rate: i.rate })),
      });
      if (res?.ok) {
        if (res.slip && win) writeSlip(win, res.slip);
        else win?.close();
        onDone();
      } else {
        win?.close();
        setError(res?.error ?? "Something went wrong.");
      }
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

      <LineItems
        title="Tests"
        catalog={tests}
        emptyHint="No tests in the catalog yet — add some in the Tests module first."
        onChange={setTestItems}
      />

      <LineItems
        title="Consultation"
        catalog={fees}
        emptyHint="No consultation fees yet — add some in the Consultation Fees tab."
        onChange={setConsultItems}
      />

      {/* Summary */}
      {summary.length > 0 && (
        <div className="rounded-xl border border-edge bg-canvas p-4">
          <p className="text-xs font-semibold tracking-wider text-ink-muted">
            SUMMARY
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {summary.map((r, idx) => (
              <li key={idx} className="flex justify-between text-sm">
                <span className="text-ink">{r.name}</span>
                <span className="font-medium text-ink">{formatRs(r.rate)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-edge pt-2 text-sm font-semibold">
            <span className="text-ink">Total</span>
            <span className="text-brand">{formatRs(total)}</span>
          </div>
        </div>
      )}

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
              ? `Save & print · ${formatRs(total)}`
              : "Save & print"}
        </button>
      </div>
    </form>
  );
}

export function ExistingPatientButton({
  tests,
  fees,
}: {
  tests: TestOption[];
  fees: FeeOption[];
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
        <Modal title="Add tests / consultation for existing patient" size="xl" onClose={() => setOpen(false)}>
          <ChargeForm tests={tests} fees={fees} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
