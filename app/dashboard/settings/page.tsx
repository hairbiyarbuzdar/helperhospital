import { KeyRound } from "lucide-react";
import { ChangePasswordForm } from "./settings-client";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-ink">Settings</h1>
      <p className="mt-1 text-ink-muted">Manage your account preferences.</p>

      <div className="mt-8 max-w-xl overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
        <div className="border-b border-edge px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas">
              <KeyRound className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="font-semibold text-ink">Change Password</p>
              <p className="text-xs text-ink-muted">Update your login password.</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
