import { FileText } from "lucide-react";
import Placeholder from "../_components/placeholder";

export default function ReportsPage() {
  return (
    <Placeholder
      title="Reports"
      description="Generate and review clinical and operational reports."
      icon={FileText}
      hint="Report generation, templates, printing and exports will live here. Tell me what reports you need."
    />
  );
}
