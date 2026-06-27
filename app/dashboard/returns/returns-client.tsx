"use client";

import { useActionState, useState, useTransition } from "react";
import { Undo2, Search } from "lucide-react";
import { returnFeeByMr, returnFee, type ReturnState } from "./actions";
import Modal from "../_components/modal";

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

const REASONS = [
  "Doctor not available",
  "Test not available",
  "Patient discharged / cancelled visit",
  "Duplicate payment",
  "Wrong fee charged",
  "Referred to another hospital",
  "Other",
] as const;

type ReasonOption = (typeof REASONS)[number];

/* ---------------------- Shared reason picker ---------------------------- */

function ReasonPicker({
  reason,
  onChange,
}: {
  reason: string;
  onChange: (v: string) => void;
}) {
  const [selected, setSelected] = useState<ReasonOption | "">("");
  const [otherText, setOtherText] = useState("");

  function pick(r: ReasonOption) {
    setSelected(r);
    onChange(r === "Other" ? otherText : r);
  }

  function handleOtherText(v: string) {
    setOtherText(v);
    onChange(v);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-ink">
        Reason for return{" "}
        <span className="text-ink-muted">(optional)</span>
      </p>
      <div className="flex flex-col gap-1.5">
        {REASONS.map((r) => (
          <label
            key={r}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
              selected === r
                ? "border-brand bg-success-soft"
                : "border-edge hover:bg-canvas"
            }`}
          >
            <input
              type="radio"
              className="hidden"
              checked={selected === r}
              onChange={() => pick(r)}
            />
            <span
              className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition ${
                selected === r ? "border-brand bg-brand" : "border-edge"
              }`}
            />
            <span className="text-sm font-medium text-ink">{r}</span>
          </label>
        ))}
      </div>
      {selected === "Other" && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => handleOtherText(e.target.value)}
          placeholder="Describe the reason…"
          autoFocus
          className={fieldClass}
        />
      )}
    </div>
  );
}

/* ---------------------- MR-based return (search bar) -------------------- */

export function ReturnByMrForm() {
  const [state, action, pending] = useActionState<ReturnState, FormData>(
    returnFeeByMr,
    undefined,
  );
  const [showModal, setShowModal] = useState(false);
  const [mr, setMr] = useState("");
  const [reason, setReason] = useState("");

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const val = ((new FormData(e.currentTarget).get("mr") as string) ?? "").trim();
    if (!val) return;
    setMr(val);
    setReason("");
    setShowModal(true);
  }

  return (
    <div>
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[16rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            name="mr"
            placeholder="Enter MR number (e.g. 0001-2026)"
            value={mr}
            onChange={(e) => setMr(e.target.value)}
            className="w-full rounded-lg border border-edge bg-surface py-2.5 pl-9 pr-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-success-soft"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          <Undo2 className="h-4 w-4" />
          Fee return
        </button>
      </form>

      {state?.error && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && state.message && (
        <p className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          {state.message}
        </p>
      )}

      {showModal && (
        <Modal title="Confirm fee return" onClose={() => setShowModal(false)}>
          <form
            action={action}
            onSubmit={() => {
              setShowModal(false);
              setMr("");
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="mr" value={mr} />
            <input type="hidden" name="reason" value={reason} />

            <p className="text-sm text-ink">
              You are about to return the fee for patient{" "}
              <span className="font-semibold text-brand">{mr}</span>. This
              cannot be undone.
            </p>

            <ReasonPicker reason={reason} onChange={setReason} />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-edge px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                <Undo2 className="h-4 w-4" />
                {pending ? "Returning…" : "Confirm return"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------- Per-row Return button (table) -------------------- */

export function RefundButton({
  paymentId,
  label,
  amount,
}: {
  paymentId: string;
  label: string;
  amount: number;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await returnFee(paymentId, reason);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setReason("");
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-canvas"
      >
        <Undo2 className="h-4 w-4" />
        Fee return
      </button>

      {open && (
        <Modal title="Confirm fee return" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">
              You are about to return the fee for{" "}
              <span className="font-semibold text-ink">{label}</span>. This
              cannot be undone.
            </p>

            <ReasonPicker reason={reason} onChange={setReason} />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-edge px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                <Undo2 className="h-4 w-4" />
                {pending ? "Returning…" : "Confirm return"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
