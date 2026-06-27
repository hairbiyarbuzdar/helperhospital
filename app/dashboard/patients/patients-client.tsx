"use client";

import { useState, useTransition } from "react";
import { UserPlus, Trash2, Pencil, Printer, X } from "lucide-react";
import { formatRs } from "@/lib/format";
import {
  createPatientWithBilling,
  deletePatient,
  updatePatient,
  getPatientSlip,
  type BillingInput,
  type UpdatePatientInput,
} from "./actions";
import LineItems, { type CatalogOption, type ChosenItem } from "./line-items";
import { openSlipWindow, writeSlip } from "./print-slip";
import Modal from "../_components/modal";

export type DoctorOption = { id: string; name: string };
export type TestOption = CatalogOption;
export type FeeOption = CatalogOption;

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

type FeeRow = { id: string; name: string; rate: number };

function AddPatientForm({
  doctors,
  fees,
  onDone,
}: {
  doctors: DoctorOption[];
  fees: FeeOption[];
  onDone: () => void;
}) {
  // Pre-populate with every active consultation fee; user can remove any.
  const [feeRows, setFeeRows] = useState<FeeRow[]>(
    fees.map((f) => ({ id: f.id, name: f.name, rate: f.rate })),
  );
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const total = feeRows.reduce((s, f) => s + f.rate, 0);

  function removeFee(id: string) {
    setFeeRows((prev) => prev.filter((f) => f.id !== id));
  }

  function updateRate(id: string, raw: string) {
    const n = parseInt(raw, 10);
    setFeeRows((prev) =>
      prev.map((f) => (f.id === id ? { ...f, rate: isNaN(n) ? 0 : Math.max(0, n) } : f)),
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
      items: [],
      consultations: feeRows.map((f) => ({ feeId: f.id, rate: f.rate })),
    };
    const win = openSlipWindow();
    startTransition(async () => {
      const res = await createPatientWithBilling(input);
      if (res?.ok) {
        if (res.slip) await writeSlip(win, res.slip);
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
            <option value="" disabled>Select</option>
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
              <option key={d.id} value={d.id}>{d.name}</option>
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
              e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 11);
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

      {/* Consultation fees — pre-loaded, removable */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">Consultation Fees</p>
        {feeRows.length === 0 ? (
          <p className="rounded-lg border border-edge bg-canvas px-3 py-3 text-sm text-ink-muted">
            No consultation fees selected.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {feeRows.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-lg border border-edge bg-canvas px-3 py-2"
              >
                <span className="flex-1 text-sm font-medium text-ink">{f.name}</span>
                <input
                  type="number"
                  value={f.rate}
                  min={0}
                  onChange={(e) => updateRate(f.id, e.target.value)}
                  className="w-24 rounded-md border border-edge bg-surface px-2 py-1 text-right text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-success-soft"
                />
                <button
                  type="button"
                  onClick={() => removeFee(f.id)}
                  title="Remove fee"
                  className="rounded-md p-1 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {feeRows.length > 0 && (
        <div className="rounded-xl border border-edge bg-canvas p-4">
          <p className="text-xs font-semibold tracking-wider text-ink-muted">SUMMARY</p>
          <ul className="mt-2 flex flex-col gap-1">
            {feeRows.map((f) => (
              <li key={f.id} className="flex justify-between text-sm">
                <span className="text-ink">{f.name}</span>
                <span className="font-medium text-ink">{formatRs(f.rate)}</span>
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
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : total > 0 ? `Save & print · ${formatRs(total)}` : "Save & print"}
        </button>
      </div>
    </form>
  );
}

export function AddPatientButton({
  doctors,
  fees,
  nextMr,
}: {
  doctors: DoctorOption[];
  fees: FeeOption[];
  nextMr: string;
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
        <Modal
          title={`Register patient · MR: ${nextMr}`}
          size="xl"
          onClose={() => setOpen(false)}
        >
          <AddPatientForm
            doctors={doctors}
            fees={fees}
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

export type PatientRow = {
  id: string;
  name: string;
  age: number;
  gender: string;
  mobile: string | null;
  cnic: string | null;
  doctorId: string | null;
};

export function PrintPatientButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handlePrint() {
    const win = openSlipWindow();
    startTransition(async () => {
      const slip = await getPatientSlip(id);
      if (slip) await writeSlip(win, slip);
      else win?.close();
    });
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={pending}
      title="Print slip"
      className="rounded-md p-1.5 text-ink-muted transition hover:bg-canvas hover:text-brand disabled:opacity-60"
    >
      <Printer className="h-4 w-4" />
    </button>
  );
}

function EditPatientForm({
  patient,
  doctors,
  onDone,
}: {
  patient: PatientRow;
  doctors: DoctorOption[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const fd = new FormData(e.currentTarget);
    const input: UpdatePatientInput = {
      id: patient.id,
      name: String(fd.get("name") ?? ""),
      age: String(fd.get("age") ?? ""),
      gender: String(fd.get("gender") ?? ""),
      mobile: String(fd.get("mobile") ?? ""),
      cnic: String(fd.get("cnic") ?? ""),
      doctorId: String(fd.get("doctorId") ?? ""),
    };
    startTransition(async () => {
      const res = await updatePatient(input);
      if (res?.ok) onDone();
      else setError(res?.error ?? "Something went wrong.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="e-name" className="text-sm font-medium text-ink">
            Name
          </label>
          <input id="e-name" name="name" defaultValue={patient.name} className={fieldClass} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="e-age" className="text-sm font-medium text-ink">
            Age
          </label>
          <input id="e-age" name="age" type="number" min={0} max={150} step={1} defaultValue={patient.age} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="e-gender" className="text-sm font-medium text-ink">
            Gender
          </label>
          <select id="e-gender" name="gender" defaultValue={patient.gender} className={fieldClass}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="e-doctorId" className="text-sm font-medium text-ink">
            Doctor
          </label>
          <select id="e-doctorId" name="doctorId" defaultValue={patient.doctorId ?? ""} className={fieldClass}>
            <option value="">— None —</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="e-mobile" className="text-sm font-medium text-ink">
            Mobile <span className="text-ink-muted">(optional)</span>
          </label>
          <input
            id="e-mobile"
            name="mobile"
            inputMode="numeric"
            maxLength={11}
            defaultValue={patient.mobile ?? ""}
            placeholder="03xxxxxxxxx"
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value
                .replace(/\D/g, "")
                .slice(0, 11);
            }}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="e-cnic" className="text-sm font-medium text-ink">
            CNIC <span className="text-ink-muted">(optional)</span>
          </label>
          <input id="e-cnic" name="cnic" defaultValue={patient.cnic ?? ""} placeholder="xxxxx-xxxxxxx-x" className={fieldClass} />
        </div>
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
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function EditPatientButton({
  patient,
  doctors,
}: {
  patient: PatientRow;
  doctors: DoctorOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Edit patient"
        className="rounded-md p-1.5 text-ink-muted transition hover:bg-canvas hover:text-brand"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {open && (
        <Modal title="Edit patient" size="lg" onClose={() => setOpen(false)}>
          <EditPatientForm
            patient={patient}
            doctors={doctors}
            onDone={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}
