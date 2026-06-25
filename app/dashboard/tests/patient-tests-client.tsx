"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatRs } from "@/lib/format";
import {
  createPatientTests,
  updatePatientTest,
  deletePatientTest,
  type ActionState,
} from "./actions";
import LineItems, { type ChosenItem } from "../patients/line-items";
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

/* ------------------------------- Order test ----------------------------- */

function OrderForm({
  patients,
  tests,
  onDone,
}: {
  patients: PatientOption[];
  tests: TestOption[];
  onDone: () => void;
}) {
  const [items, setItems] = useState<ChosenItem[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const testMap = new Map(tests.map((t) => [t.id, t]));
  const summary = items.map((i) => ({
    name: testMap.get(i.id)?.name ?? "Test",
    rate: i.rate,
  }));
  const total = summary.reduce((s, r) => s + r.rate, 0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const patientId = String(new FormData(e.currentTarget).get("patientId") ?? "");
    if (!patientId) {
      setError("Select a patient.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one test.");
      return;
    }
    const win = openSlipWindow();
    startTransition(async () => {
      const res = await createPatientTests({
        patientId,
        items: items.map((i) => ({ testId: i.id, rate: i.rate })),
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
        <label htmlFor="patientId" className="text-sm font-medium text-ink">
          Patient
        </label>
        <select id="patientId" name="patientId" defaultValue="" className={fieldClass}>
          <option value="" disabled>
            Select patient
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <LineItems
        title="Tests"
        catalog={tests}
        emptyHint="Add tests in the Test Catalog tab first."
        onChange={setItems}
      />

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
          disabled={pending || patients.length === 0}
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
        Order test
      </button>
      {open && (
        <Modal title="Order tests" size="lg" onClose={() => setOpen(false)}>
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
