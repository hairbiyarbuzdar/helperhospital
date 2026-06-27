"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, Printer, CheckCircle2, RefreshCw } from "lucide-react";
import { changePassword, getSystemPrinters, type PasswordState } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

const STORAGE_KEY = "hh_preferred_printer";

function PwdInput({ name, placeholder }: { name: string; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        required
        className={`${fieldClass} pr-10`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/* ─── Change Password ─────────────────────────────────────────────────────── */

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink">Current password</label>
        <PwdInput name="current" placeholder="Enter current password" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink">New password</label>
        <PwdInput name="password" placeholder="Min 6 characters" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink">Confirm new password</label>
        <PwdInput name="confirm" placeholder="Re-enter new password" />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Password changed successfully.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}

/* ─── Printer Settings ────────────────────────────────────────────────────── */

export function PrinterSettings({ initialPrinters }: { initialPrinters: string[] }) {
  const [printers, setPrinters] = useState<string[]>(initialPrinters);
  const [selected, setSelected] = useState("");
  const [saved, setSaved] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? "";
    setSaved(stored);
    setSelected(stored);
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    const list = await getSystemPrinters();
    setPrinters(list);
    setRefreshing(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, selected);
    setSaved(selected);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 3000);
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">Select printer</p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {printers.length === 0 ? (
        <p className="rounded-lg border border-edge bg-canvas px-4 py-3 text-sm text-ink-muted">
          No printers detected. Make sure the app is running on the same
          Windows computer as your printer, then click Refresh.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {printers.map((p) => (
            <label
              key={p}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                selected === p
                  ? "border-brand bg-success-soft"
                  : "border-edge hover:bg-canvas"
              }`}
            >
              <input
                type="radio"
                className="hidden"
                checked={selected === p}
                onChange={() => setSelected(p)}
              />
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition ${
                  selected === p ? "border-brand bg-brand" : "border-edge"
                }`}
              />
              <Printer
                className={`h-4 w-4 shrink-0 ${selected === p ? "text-brand" : "text-ink-muted"}`}
              />
              <span className="text-sm font-medium text-ink">{p}</span>
            </label>
          ))}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-edge bg-canvas px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <span className="text-ink-muted">Active printer:</span>
          <span className="font-semibold text-ink">{saved}</span>
        </div>
      )}

      {confirmed && (
        <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Printer saved. Print jobs will go directly to this printer.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!selected || selected === saved}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-40"
        >
          Save printer
        </button>
      </div>
    </form>
  );
}
