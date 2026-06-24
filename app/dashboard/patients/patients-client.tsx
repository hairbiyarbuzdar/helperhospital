"use client";

import { useRef, useState, useTransition } from "react";
import { UserPlus, Trash2, X } from "lucide-react";
import { formatRs } from "@/lib/format";
import {
  createPatientWithBilling,
  deletePatient,
  type BillingInput,
} from "./actions";
import Modal from "../_components/modal";

export type DoctorOption = { id: string; name: string };
export type TestOption = { id: string; name: string; rate: number };
export type MethodOption = { id: string; name: string };

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

type Row = { key: number; testId: string; rate: string };

function AddPatientForm({
  doctors,
  tests,
  methods,
  onDone,
}: {
  doctors: DoctorOption[];
  tests: TestOption[];
  methods: MethodOption[];
  onDone: () => void;
}) {
  // Always start with one empty row.
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
      // Keep at least one row visible at all times.
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
      // Selecting a test in the last row spawns a fresh empty row below it.
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
    const fd = new FormData(e.currentTarget);
    const input: BillingInput = {
      name: String(fd.get("name") ?? ""),
      age: String(fd.get("age") ?? ""),
      gender: String(fd.get("gender") ?? ""),
      mobile: String(fd.get("mobile") ?? ""),
      cnic: String(fd.get("cnic") ?? ""),
      doctorId: String(fd.get("doctorId") ?? ""),
      paymentMethodId: String(fd.get("paymentMethodId") ?? ""),
      items: chosen.map((r) => ({
        testId: r.testId,
        rate: parseInt(r.rate, 10) || 0,
      })),
    };
    startTransition(async () => {
      const res = await createPatientWithBilling(input);
      if (res?.ok) onDone();
      else setError(res?.error ?? "Something went wrong.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Patient details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Name
          </label>
          <input id="name" name="name" placeholder="Patient full name" className={fieldClass} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="age" className="text-sm font-medium text-ink">
            Age
          </label>
          <input id="age" name="age" type="number" min={0} max={150} step={1} placeholder="0" className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gender" className="text-sm font-medium text-ink">
            Gender
          </label>
          <select id="gender" name="gender" defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Select
            </option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="doctorId" className="text-sm font-medium text-ink">
            Doctor <span className="text-ink-muted">(going with)</span>
          </label>
          <select id="doctorId" name="doctorId" defaultValue="" className={fieldClass}>
            <option value="">— None —</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mobile" className="text-sm font-medium text-ink">
            Mobile <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id="mobile"
            name="mobile"
            inputMode="numeric"
            maxLength={11}
            placeholder="03xxxxxxxxx"
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value
                .replace(/\D/g, "")
                .slice(0, 11);
            }}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="cnic" className="text-sm font-medium text-ink">
            CNIC <span className="text-ink-muted">(optional)</span>
          </label>
          <input id="cnic" name="cnic" placeholder="xxxxx-xxxxxxx-x" className={fieldClass} />
        </div>
      </div>

      {/* Tests */}
      <div className="border-t border-edge pt-4">
        <p className="text-sm font-semibold text-ink">Tests</p>

        {tests.length === 0 && (
          <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            No tests in the catalog yet — add some in the Tests module to bill them here.
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

      {/* Payment method */}
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
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : total > 0 ? `Register & collect ${formatRs(total)}` : "Register patient"}
        </button>
      </div>
    </form>
  );
}

export function AddPatientButton({
  doctors,
  tests,
  methods,
}: {
  doctors: DoctorOption[];
  tests: TestOption[];
  methods: MethodOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        <UserPlus className="h-4 w-4" />
        Add patient
      </button>
      {open && (
        <Modal title="Register patient" size="xl" onClose={() => setOpen(false)}>
          <AddPatientForm
            doctors={doctors}
            tests={tests}
            methods={methods}
            onDone={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}

export function DeletePatientButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete patient "${name}"? This cannot be undone.`)) return;
    startTransition(() => {
      deletePatient(id);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      title="Delete patient"
      className="rounded-md p-1.5 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
