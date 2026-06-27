import { FileText } from "lucide-react";
import ReportsClient from "./reports-client";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas">
          <FileText className="h-5 w-5 text-brand" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-ink">Reports</h1>
          <p className="text-sm text-ink-muted">
            Pick a report, set filters, then generate — no charts, export-friendly tables.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <ReportsClient />
      </div>
    </div>
  );
}
