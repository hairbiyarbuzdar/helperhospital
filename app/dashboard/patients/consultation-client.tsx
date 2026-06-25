"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createConsultationFee,
  deleteConsultationFee,
  type ActionState,
} from "./consultation-actions";
import Modal from "../_components/modal";

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

function AddFeeForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createConsultationFee,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Fee name
        </label>
        <input id="name" name="name" placeholder="e.g. Specialist Consultation" className={fieldClass} autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rate" className="text-sm font-medium text-ink">
          Rate (Rs)
        </label>
        <input id="rate" name="rate" type="number" min={0} step={1} placeholder="0" className={fieldClass} />
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
          {pending ? "Saving…" : "Add fee"}
        </button>
      </div>
    </form>
  );
}

export function AddConsultationFeeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        <Plus className="h-4 w-4" />
        Add consultation fee
      </button>
      {open && (
        <Modal title="Add consultation fee" onClose={() => setOpen(false)}>
          <AddFeeForm onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

export function DeleteConsultationFeeButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [, startTransition] = useTransition();
  function handleDelete() {
    if (!confirm(`Delete consultation fee "${name}"?`)) return;
    startTransition(() => {
      deleteConsultationFee(id);
    });
  }
  return (
    <button
      type="button"
      onClick={handleDelete}
      title="Delete fee"
      className="rounded-md p-1.5 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
