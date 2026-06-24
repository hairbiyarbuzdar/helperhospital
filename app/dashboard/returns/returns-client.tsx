"use client";

import { useActionState, useTransition } from "react";
import { Undo2, Search } from "lucide-react";
import { returnFeeByMr, returnFee, type ReturnState } from "./actions";

export function ReturnByMrForm() {
  const [state, action, pending] = useActionState<ReturnState, FormData>(
    returnFeeByMr,
    undefined,
  );

  return (
    <div>
      <form action={action} className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[16rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            name="mr"
            placeholder="Enter MR number (e.g. 1)"
            className="w-full rounded-lg border border-edge bg-surface py-2.5 pl-9 pr-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-success-soft"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          <Undo2 className="h-4 w-4" />
          {pending ? "Returning…" : "Fee return"}
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
    </div>
  );
}

export function RefundButton({
  paymentId,
  label,
}: {
  paymentId: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Return the fee for ${label}?`)) return;
    startTransition(() => {
      returnFee(paymentId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-canvas disabled:opacity-60"
    >
      <Undo2 className="h-4 w-4" />
      {pending ? "Returning…" : "Fee return"}
    </button>
  );
}
