"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { UserPlus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import {
  createUser,
  updateUser,
  deleteUser,
  type UserActionState,
} from "./actions";
import {
  STAFF_ROLES,
  ROLE_LABEL,
  ROLE_MODULES,
  type StaffRole,
} from "./constants";
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

function RoleRadios({
  defaultValue,
  onChange,
}: {
  defaultValue?: StaffRole;
  onChange?: (r: StaffRole) => void;
}) {
  const [selected, setSelected] = useState<StaffRole>(
    defaultValue ?? "RECEPTIONIST",
  );

  function pick(r: StaffRole) {
    setSelected(r);
    onChange?.(r);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {STAFF_ROLES.map((r) => (
          <label
            key={r}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition ${
              selected === r
                ? "border-brand bg-success-soft text-brand"
                : "border-edge text-ink hover:bg-canvas"
            }`}
          >
            <input
              type="radio"
              name="role"
              value={r}
              checked={selected === r}
              onChange={() => pick(r)}
              className="hidden"
            />
            <span
              className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                selected === r ? "border-brand bg-brand" : "border-edge"
              }`}
            />
            <span className="text-sm font-medium">{ROLE_LABEL[r]}</span>
          </label>
        ))}
      </div>

      {/* Module access summary */}
      <div className="rounded-lg border border-edge bg-canvas px-4 py-3">
        <p className="mb-1.5 text-xs font-semibold tracking-wider text-ink-muted">
          MODULE ACCESS
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_MODULES[selected].map((m) => (
            <span
              key={m}
              className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-brand"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

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
          <label htmlFor="cu-username" className="text-sm font-medium text-ink">
            Username
          </label>
          <input
            id="cu-username"
            name="username"
            placeholder="staff_name"
            className={fieldClass}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cu-name" className="text-sm font-medium text-ink">
            Full name <span className="text-ink-muted">(optional)</span>
          </label>
          <input id="cu-name" name="name" placeholder="Display name" className={fieldClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cu-password" className="text-sm font-medium text-ink">
          Password
        </label>
        <PasswordInput name="password" placeholder="Min 6 characters" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-ink">Role</p>
        <RoleRadios defaultValue="RECEPTIONIST" />
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
        <Modal title="Create staff user" size="lg" onClose={() => setOpen(false)}>
          <CreateUserForm onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

export type UserRow = {
  id: string;
  username: string;
  name: string | null;
  role: string;
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
          <label htmlFor="eu-name" className="text-sm font-medium text-ink">
            Full name <span className="text-ink-muted">(optional)</span>
          </label>
          <input id="eu-name" name="name" defaultValue={user.name ?? ""} placeholder="Display name" className={fieldClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink">
          New password <span className="text-ink-muted">(leave blank to keep current)</span>
        </label>
        <PasswordInput name="password" placeholder="Min 6 characters" />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-ink">Role</p>
        <RoleRadios defaultValue={user.role as StaffRole} />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={user.isActive}
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
    if (!confirm(`Delete user "${user.username}"? They will no longer be able to log in.`)) return;
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
