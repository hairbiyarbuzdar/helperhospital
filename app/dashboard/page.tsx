import Link from "next/link";
import {
  Users,
  Wallet,
  Stethoscope,
  TestTube,
  FileText,
  ShieldCheck,
  Receipt,
  Undo2,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { formatRs } from "@/lib/format";

export const dynamic = "force-dynamic";

const MODULES = [
  { href: "/dashboard/patients", label: "Patients", icon: Users },
  { href: "/dashboard/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/dashboard/tests", label: "Tests", icon: TestTube },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/returns", label: "Fee Return", icon: Undo2 },
  { href: "/dashboard/users", label: "User Management", icon: ShieldCheck },
];

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function DashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [user, todayReceipts, todayTests, collection, refunds] =
    await Promise.all([
      getUser(),
      // Receipts (payments) collected today.
      prisma.payment.count({ where: { createdAt: { gte: startOfToday } } }),
      // Tests ordered today.
      prisma.patientTest.count({ where: { createdAt: { gte: startOfToday } } }),
      // Net amount collected (excludes refunded payments).
      prisma.payment.aggregate({
        where: { refundedAt: null },
        _sum: { amount: true },
      }),
      // Total amount refunded.
      prisma.payment.aggregate({
        where: { refundedAt: { not: null } },
        _sum: { amount: true },
      }),
    ]);

  const stats = [
    { label: "Today's Receipts", value: String(todayReceipts), icon: Receipt },
    { label: "Today's Tests", value: String(todayTests), icon: TestTube },
    {
      label: "Total Collection",
      value: formatRs(collection._sum.amount ?? 0),
      icon: Wallet,
    },
    { label: "Refunds", value: formatRs(refunds._sum.amount ?? 0), icon: Undo2 },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <p className="text-xs font-semibold tracking-wider text-brand">
        {today.toUpperCase()}
      </p>
      <h1 className="mt-1 text-3xl font-bold text-ink">
        Welcome, {user?.name ?? user?.username}
      </h1>
      <p className="mt-1 text-ink-muted">
        Here&apos;s an overview of your hospital management system.
      </p>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-edge"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-soft text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-ink-muted">{s.label}</p>
              <p className="mt-1 text-4xl font-bold text-ink">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Module quick links */}
      <div className="mt-6 rounded-2xl bg-surface shadow-sm ring-1 ring-edge">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-ink">Modules</h2>
        </div>
        <ul className="grid grid-cols-2 gap-3 px-6 pb-6 sm:grid-cols-3 lg:grid-cols-6">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <li key={m.href}>
                <Link
                  href={m.href}
                  className="flex flex-col items-start gap-2 rounded-xl border border-edge p-3 transition hover:bg-canvas"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-soft text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-ink">{m.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
