import { KeyRound, Printer } from "lucide-react";
import { ChangePasswordForm, PrinterSettings } from "./settings-client";
import { getSystemPrinters } from "./actions";

export const dynamic = "force-dynamic";

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
      <div className="border-b border-edge px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas">
            <Icon className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="font-semibold text-ink">{title}</p>
            <p className="text-xs text-ink-muted">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default async function SettingsPage() {
  const printers = await getSystemPrinters();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-ink">Settings</h1>
      <p className="mt-1 text-ink-muted">Manage your account and system preferences.</p>

      <div className="mt-8 flex max-w-xl flex-col gap-6">
        <Section
          icon={KeyRound}
          title="Change Password"
          description="Update your login password."
        >
          <ChangePasswordForm />
        </Section>

        <Section
          icon={Printer}
          title="Printer Settings"
          description="Select a printer for direct printing — no dialog needed."
        >
          <PrinterSettings initialPrinters={printers} />
        </Section>
      </div>
    </div>
  );
}
