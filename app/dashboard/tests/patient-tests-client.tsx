"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { formatRs } from "@/lib/format";
import {
  createPatientTests,
  updatePatientTest,
  deletePatientTest,
  type ActionState,
} from "./actions";
import { openSlipWindow, writeSlip } from "../patients/print-slip";
import Modal from "../_components/modal";

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

export type PatientOption = { id: string; label: string };
export type TestOption = { id: string; name: string; rate: number };
export type OrderView = {
  id: string;
  patientLabel: string;
  testName: string;
  rate: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  payment: "UNPAID" | "PAID";
  result: string | null;
};

/* ------------------------------- New test -------------------------------- */

function PatientSearch({
  patients,
  onSelect,
}: {
  patients: PatientOption[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const hits = query.trim().length > 0
    ? patients
        .filter((p) =>
          p.label.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 10)
    : [];

  function pick(p: PatientOption) {
    setSelectedId(p.id);
    setQuery(p.label);
    setOpen(false);
    onSelect(p.id);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setSelectedId("");
    onSelect("");
    setOpen(true);
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          placeholder="Search by name or MR number…"
          autoComplete="off"
          className="w-full rounded-lg border border-edge bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft"
        />
      </div>
      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-edge bg-surface shadow-lg">
          {hits.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(p); }}
                className="w-full px-4 py-2.5 text-left text-sm text-ink transition hover:bg-canvas"
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length > 0 && hits.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-edge bg-surface px-4 py-3 text-sm text-ink-muted shadow-lg">
          No patients without tests found.
        </div>
      )}
      <input type="hidden" name="patientId" value={selectedId} />
    </div>
  );
}

const rowFieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

function OrderForm({
  patients,
  tests,
  onDone,
}: {
  patients: PatientOption[];
  tests: TestOption[];
  onDone: () => void;
}) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [testRows, setTestRows] = useState<TestOption[]>(tests);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const total = testRows.reduce((s, r) => s + r.rate, 0);

  function removeTest(id: string) {
    setTestRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRate(id: string, raw: string) {
    const n = parseInt(raw, 10);
    setTestRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rate: isNaN(n) ? 0 : Math.max(0, n) } : r)),
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const patientId = String(new FormData(e.currentTarget).get("patientId") ?? "");
    if (!patientId) {
      setError("Select a patient from the search results.");
      return;
    }
    if (testRows.length === 0) {
      setError("Add at least one test.");
      return;
    }
    const win = openSlipWindow();
    startTransition(async () => {
      const res = await createPatientTests({
        patientId,
        items: testRows.map((r) => ({ testId: r.id, rate: r.rate })),
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
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink">Patient</label>
        {patients.length === 0 ? (
          <p className="rounded-lg border border-edge bg-canvas px-3 py-3 text-sm text-ink-muted">
            All registered patients already have tests. Register a new patient first.
          </p>
        ) : (
          <PatientSearch patients={patients} onSelect={setSelectedPatientId} />
        )}
      </div>

      <div className="border-t border-edge pt-4">
        <p className="text-sm font-semibold text-ink">Tests</p>
        {tests.length === 0 ? (
          <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            No tests in catalog. Add tests in the Test Catalog tab first.
          </p>
        ) : testRows.length === 0 ? (
          <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-xs text-ink-muted">
            All tests removed.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {testRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
                <span className="rounded-lg border border-edge bg-canvas px-3 py-2.5 text-sm text-ink">
                  {row.name}
                </span>
                <input
                  value={row.rate}
                  onChange={(e) => updateRate(row.id, e.target.value)}
                  inputMode="numeric"
                  placeholder="Rate"
                  className={`${rowFieldClass} text-right`}
                />
                <button
                  type="button"
                  onClick={() => removeTest(row.id)}
                  className="rounded-md p-2 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {testRows.length > 0 && (
        <div className="rounded-xl border border-edge bg-canvas p-4">
          <p className="text-xs font-semibold tracking-wider text-ink-muted">SUMMARY</p>
          <ul className="mt-2 flex flex-col gap-1">
            {testRows.map((r) => (
              <li key={r.id} className="flex justify-between text-sm">
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
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
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
          disabled={pending || !selectedPatientId}
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
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

export function OrderTestButton({
  patients,
  tests,
}: {
  patients: PatientOption[];
  tests: TestOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        <Plus className="h-4 w-4" />
        New test
      </button>
      {open && (
        <Modal title="New test" size="lg" onClose={() => setOpen(false)}>
          <OrderForm patients={patients} tests={tests} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

/* ------------------------------ Update test ----------------------------- */

function UpdateForm({ order, onDone }: { order: OrderView; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updatePatientTest,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={order.id} />

      <div className="rounded-lg bg-canvas px-3 py-2 text-sm text-ink-muted">
        <span className="font-medium text-ink">{order.testName}</span> ·{" "}
        {order.patientLabel} · {formatRs(order.rate)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-ink">
            Status
          </label>
          <select id="status" name="status" defaultValue={order.status} className={fieldClass}>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment" className="text-sm font-medium text-ink">
            Payment
          </label>
          <select id="payment" name="payment" defaultValue={order.payment} className={fieldClass}>
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="result" className="text-sm font-medium text-ink">
          Result / notes <span className="text-ink-muted">(optional)</span>
        </label>
        <textarea
          id="result"
          name="result"
          rows={4}
          defaultValue={order.result ?? ""}
          placeholder="Enter test result or notes"
          className={fieldClass}
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
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
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function UpdateTestButton({ order }: { order: OrderView }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Update test"
        className="rounded-md p-1.5 text-ink-muted transition hover:bg-canvas hover:text-brand"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {open && (
        <Modal title="Update test" onClose={() => setOpen(false)}>
          <UpdateForm order={order} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

export function DeleteTestButton({ id, label }: { id: string; label: string }) {
  const [, startTransition] = useTransition();
  function handleDelete() {
    if (!confirm(`Remove this test order (${label})?`)) return;
    startTransition(() => {
      deletePatientTest(id);
    });
  }
  return (
    <button
      type="button"
      onClick={handleDelete}
      title="Remove order"
      className="rounded-md p-1.5 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
