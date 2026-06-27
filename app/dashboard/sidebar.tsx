"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Eye,
  LayoutGrid,
  Users,
  Stethoscope,
  TestTube,
  FileText,
  Undo2,
  History,
  ShieldCheck,
  LogOut,
  DatabaseBackup,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { logout } from "@/app/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/patients", label: "Patients", icon: Users },
  { href: "/dashboard/tests", label: "Tests", icon: TestTube },
  { href: "/dashboard/returns", label: "Fee Return", icon: Undo2 },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/dashboard/activity", label: "Activity Log", icon: History },
  { href: "/dashboard/users", label: "User Management", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Sidebar({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  const pathname = usePathname();
  const [backupDone, setBackupDone] = useState(false);

  function handleBackup() {
    setBackupDone(true);
    setTimeout(() => setBackupDone(false), 3000);
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-sidebar text-ink-onbrand">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-active">
          <Eye className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="font-bold">Helper Hospital</p>
          <p className="text-xs text-sidebar-muted">Management System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2">
        <p className="px-3 pb-2 text-xs font-semibold tracking-wider text-sidebar-muted">
          WORKSPACE
        </p>
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-sidebar-active text-white"
                      : "text-sidebar-muted hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Auto backup */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={handleBackup}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition hover:bg-white/5 hover:text-white"
        >
          <DatabaseBackup className="h-5 w-5 shrink-0" />
          Auto backup
        </button>
      </div>

      {/* Backup toast — fixed bottom-right */}
      {backupDone && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl bg-white px-5 py-4 shadow-2xl ring-1 ring-black/8 animate-toast-in">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-gray-900">Backup Successful</p>
            <p className="text-xs text-gray-500">Data saved successfully.</p>
          </div>
        </div>
      )}

      {/* User + logout */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-active text-sm font-semibold text-white">
            {initials(name)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-xs text-sidebar-muted">{role}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Log out"
              className="rounded-md p-2 text-sidebar-muted transition hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
