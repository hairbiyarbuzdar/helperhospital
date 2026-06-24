"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createDoctor, deleteDoctor, type ActionState } from "./actions";
import Modal from "../_components/modal";

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

function AddDoctorForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createDoctor,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Name
        </label>
        <input id="name" name="name" placeholder="Dr. Full name" className={fieldClass} autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="specialty" className="text-sm font-medium text-ink">
            Specialty <span className="text-ink-muted">(optional)</span>
          </label>
          <input id="specialty" name="specialty" placeholder="Ophthalmologist" className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="qualification" className="text-sm font-medium text-ink">
            Qualification <span className="text-ink-muted">(optional)</span>
          </label>
          <input id="qualification" name="qualification" placeholder="MBBS, FCPS" className={fieldClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="mobile" className="text-sm font-medium text-ink">
          Mobile number <span className="text-ink-muted">(optional)</span>
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email <span className="text-ink-muted">(optional)</span>
        </label>
        <input id="email" name="email" type="email" placeholder="doctor@example.com" className={fieldClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fee" className="text-sm font-medium text-ink">
          Consultation fee (Rs) <span className="text-ink-muted">(optional)</span>
        </label>
        <input id="fee" name="fee" type="number" min={0} step={1} placeholder="0" className={fieldClass} />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked
          className="h-4 w-4 rounded border-edge text-brand focus:ring-brand"
        />
        Active
      </label>

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
          {pending ? "Saving…" : "Add doctor"}
        </button>
      </div>
    </form>
  );
}

export function AddDoctorButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        <Plus className="h-4 w-4" />
        Add doctor
      </button>
      {open && (
        <Modal title="Add doctor" onClose={() => setOpen(false)}>
          <AddDoctorForm onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

export function DeleteDoctorButton({ id, name }: { id: string; name: string }) {
  const [, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete doctor "${name}"? This cannot be undone.`)) return;
    startTransition(() => {
      deleteDoctor(id);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      title="Delete doctor"
      className="rounded-md p-1.5 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
