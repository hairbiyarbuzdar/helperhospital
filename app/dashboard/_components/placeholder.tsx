import type { LucideIcon } from "lucide-react";

export default function Placeholder({
  title,
  description,
  icon: Icon,
  hint,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  hint: string;
}) {
  return (
    <div className="p-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-soft text-brand">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-ink">{title}</h1>
          <p className="mt-1 text-ink-muted">{description}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge bg-surface px-6 py-20 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-soft text-brand">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink">Coming soon</h2>
        <p className="mt-1 max-w-md text-sm text-ink-muted">{hint}</p>
      </div>
    </div>
  );
}
