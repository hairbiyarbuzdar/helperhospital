export const STAFF_ROLES = [
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "PHARMACIST",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABEL: Record<string, string> = {
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  RECEPTIONIST: "Receptionist",
  PHARMACIST: "Pharmacist",
  ADMIN: "Admin",
};

export const ROLE_MODULES: Record<StaffRole, string[]> = {
  DOCTOR: ["Dashboard", "Patients", "Tests", "Activity Log"],
  NURSE: ["Dashboard", "Patients", "Tests", "Activity Log"],
  RECEPTIONIST: [
    "Dashboard",
    "Patients",
    "Doctors",
    "Tests",
    "Fee Return",
    "Consultation Fees",
    "Activity Log",
  ],
  PHARMACIST: ["Dashboard", "Tests", "Activity Log"],
};
