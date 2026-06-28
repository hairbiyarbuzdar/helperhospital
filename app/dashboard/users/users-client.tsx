"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { UserPlus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { createUser, updateUser, deleteUser, type UserActionState } from "./actions";
import { MODULES } from "./constants";
import Modal from "../_components/modal";

const fieldClass =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-success-soft";

function PasswordInput({
  name,
  placeholder,
  required,
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        className={`${fieldClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ModuleCheckboxes({ defaultModules = [] }: { defaultModules?: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultModules));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {MODULES.map((m) => {
          const checked = selected.has(m.key);
          return (
            <label
              key={m.key}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition select-none ${
                checked
                  ? "border-brand bg-success-soft text-brand"
                  : "border-edge text-ink hover:bg-canvas"
              }`}
            >
              <input
                type="checkbox"
                name="modules"
                value={m.key}
                checked={checked}
                onChange={() => toggle(m.key)}
                className="hidden"
              />
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
                  checked ? "border-brand bg-brand" : "border-edge"
                }`}
              >
                {checked && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-sm font-medium">{m.label}</span>
            </label>
          );
        })}
      </div>
      {selected.size === 0 && (
        <p className="text-xs text-warning">No modules selected — this user won't see any sections.</p>
      )}
    </div>
  );
}

/* ─── Create ─── */

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    createUser,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">Username</label>
          <input
            name="username"
            placeholder="e.g. receptionist1"
            className={fieldClass}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">Password</label>
          <PasswordInput name="password" placeholder="Min 6 characters" required />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">Module access</p>
        <ModuleCheckboxes />
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
          {pending ? "Creating…" : "Create user"}
        </button>
      </div>
    </form>
  );
}

export function CreateUserButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
      >
        <UserPlus className="h-4 w-4" />
        Add user
      </button>
      {open && (
        <Modal title="Create user" size="lg" onClose={() => setOpen(false)}>
          <CreateUserForm onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

/* ─── Edit ─── */

export type UserRow = {
  id: string;
  username: string;
  modules: string[];
  isActive: boolean;
};

function EditUserForm({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    updateUser,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={user.id} />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-muted">Username</label>
          <div className="rounded-lg border border-edge bg-canvas px-3 py-2.5 text-sm text-ink-muted">
            {user.username}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">
            New password <span className="text-ink-muted text-xs">(leave blank to keep)</span>
          </label>
          <PasswordInput name="password" placeholder="Min 6 characters" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">Module access</p>
        <ModuleCheckboxes defaultModules={user.modules} />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={user.isActive}
          className="h-4 w-4 rounded border-edge accent-brand"
        />
        Active account
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
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function EditUserButton({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Edit user"
        className="rounded-md p-1.5 text-ink-muted transition hover:bg-canvas hover:text-brand"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {open && (
        <Modal title={`Edit ${user.username}`} size="lg" onClose={() => setOpen(false)}>
          <EditUserForm user={user} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

export function DeleteUserButton({ user }: { user: UserRow }) {
  const [, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${user.username}"? They will no longer be able to log in.`)) return;
    startTransition(async () => {
      await deleteUser(user.id);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      title="Delete user"
      className="rounded-md p-1.5 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
