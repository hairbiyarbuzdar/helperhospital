import { ShieldCheck } from "lucide-react";
import Placeholder from "../_components/placeholder";

export default function UsersPage() {
  return (
    <Placeholder
      title="User Management"
      description="Manage staff accounts, roles and permissions."
      icon={ShieldCheck}
      hint="Create users, assign roles (Admin, Doctor, Nurse, Receptionist, Pharmacist) and control access here. Tell me the permission rules you want."
    />
  );
}
