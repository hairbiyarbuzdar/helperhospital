export const MODULES = [
  { key: "patients",  label: "Patients" },
  { key: "tests",     label: "Tests" },
  { key: "returns",   label: "Fee Return" },
  { key: "reports",   label: "Reports" },
  { key: "doctors",   label: "Doctors" },
  { key: "activity",  label: "Activity Log" },
  { key: "users",     label: "User Management" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
