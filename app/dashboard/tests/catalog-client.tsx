"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createCatalogTest,
  deleteCatalogTest,
  type ActionState,
} from "./actions";
import Modal from "../_components/modal";

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

function AddCatalogForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createCatalogTest,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Test name
        </label>
        <input id="name" name="name" placeholder="e.g. OCT Scan" className={fieldClass} autoFocus />
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
          {pending ? "Saving…" : "Add test"}
        </button>
      </div>
    </form>
  );
}

export function AddCatalogButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        <Plus className="h-4 w-4" />
        Add test
      </button>
      {open && (
        <Modal title="Add test to catalog" onClose={() => setOpen(false)}>
          <AddCatalogForm onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

export function DeleteCatalogButton({ id, name }: { id: string; name: string }) {
  const [, startTransition] = useTransition();
  function handleDelete() {
    if (!confirm(`Delete "${name}" from the catalog?`)) return;
    startTransition(() => {
      deleteCatalogTest(id);
    });
  }
  return (
    <button
      type="button"
      onClick={handleDelete}
      title="Delete test"
      className="rounded-md p-1.5 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
