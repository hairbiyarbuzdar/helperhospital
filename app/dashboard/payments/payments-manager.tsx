"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { ArrowLeftRight, Plus, Trash2, CreditCard } from "lucide-react";
import { formatRs } from "@/lib/format";
import {
  createPaymentMethod,
  deletePaymentMethod,
  transferFunds,
  type ActionState,
} from "./actions";
import Modal from "../_components/modal";

export type MethodView = {
  id: string;
  name: string;
  openingBalance: number;
  currentBalance: number;
};

const fieldClass =
  "rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

function AddMethodForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createPaymentMethod,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Method name
        </label>
        <input id="name" name="name" placeholder="e.g. CASH" className={fieldClass} autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="openingBalance" className="text-sm font-medium text-ink">
          Opening balance (Rs)
        </label>
        <input
          id="openingBalance"
          name="openingBalance"
          type="number"
          min={0}
          step={1}
          defaultValue={0}
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
          {pending ? "Saving…" : "Add method"}
        </button>
      </div>
    </form>
  );
}

function TransferForm({
  methods,
  defaultFromId,
  onDone,
}: {
  methods: MethodView[];
  defaultFromId?: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    transferFunds,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fromId" className="text-sm font-medium text-ink">
          From
        </label>
        <select id="fromId" name="fromId" defaultValue={defaultFromId ?? ""} className={fieldClass}>
          <option value="" disabled>
            Select method
          </option>
          {methods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({formatRs(m.currentBalance)})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="toId" className="text-sm font-medium text-ink">
          To
        </label>
        <select id="toId" name="toId" defaultValue="" className={fieldClass}>
          <option value="" disabled>
            Select method
          </option>
          {methods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({formatRs(m.currentBalance)})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount" className="text-sm font-medium text-ink">
          Amount (Rs)
        </label>
        <input id="amount" name="amount" type="number" min={1} step={1} placeholder="0" className={fieldClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-medium text-ink">
          Note (optional)
        </label>
        <input id="note" name="note" placeholder="Reason for transfer" className={fieldClass} />
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
          {pending ? "Transferring…" : "Transfer"}
        </button>
      </div>
    </form>
  );
}

export default function PaymentsManager({ methods }: { methods: MethodView[] }) {
  const [modal, setModal] = useState<null | "add" | "transfer">(null);
  const [transferFrom, setTransferFrom] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  function openTransfer(fromId?: string) {
    setTransferFrom(fromId);
    setModal("transfer");
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This also removes its transfers.`)) return;
    startTransition(() => {
      deletePaymentMethod(id);
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => openTransfer()}
          disabled={methods.length < 2}
          className="flex items-center gap-2 rounded-full border border-edge bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
          title={methods.length < 2 ? "Add at least two methods first" : undefined}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Transfer Funds
        </button>
        <button
          type="button"
          onClick={() => setModal("add")}
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" />
          Add method
        </button>
      </div>

      {/* Active methods */}
      <section className="mt-8">
        <div className="flex items-center justify-between border-b border-edge pb-2">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-muted">
            <CreditCard className="h-4 w-4" />
            ACTIVE METHODS
          </p>
          <span className="text-sm font-semibold text-ink-muted">
            {methods.length}
          </span>
        </div>

        {methods.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-edge bg-surface px-6 py-12 text-center text-sm text-ink-muted">
            No payment methods yet. Click <span className="font-medium text-ink">Add method</span> to create one.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {methods.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-edge"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-bold tracking-wide text-ink">
                    {m.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openTransfer(m.id)}
                      title="Transfer from this method"
                      className="rounded-md p-1.5 text-ink-muted transition hover:bg-canvas hover:text-brand"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id, m.name)}
                      title="Delete method"
                      className="rounded-md p-1.5 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-xs font-semibold tracking-wider text-ink-muted">
                  OPENING
                </p>
                <p className="text-sm text-ink-muted">
                  {formatRs(m.openingBalance)}
                </p>

                <p className="mt-3 text-xs font-semibold tracking-wider text-ink-muted">
                  CURRENT BALANCE
                </p>
                <p className="text-3xl font-bold text-ink">
                  {formatRs(m.currentBalance)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {modal === "add" && (
        <Modal title="Add payment method" onClose={() => setModal(null)}>
          <AddMethodForm onDone={() => setModal(null)} />
        </Modal>
      )}
      {modal === "transfer" && (
        <Modal title="Transfer funds" onClose={() => setModal(null)}>
          <TransferForm
            methods={methods}
            defaultFromId={transferFrom}
            onDone={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  );
}
