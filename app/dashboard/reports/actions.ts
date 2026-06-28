"use server";

import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

function dayBounds(dateStr: string) {
  return {
    start: new Date(`${dateStr}T00:00:00+05:00`),
    end: new Date(`${dateStr}T23:59:59.999+05:00`),
  };
}

// ─── Today's Report ──────────────────────────────────────────────────────────

export type TodayPatientRow = {
  mrNumber: string;
  name: string;
  doctor: string | null;
  items: string[]; // tests + consultations combined
  paid: number;
};

export type TodayReport = {
  date: string;
  patientsRegistered: number;
  testsOrdered: number;
  totalCollected: number;
  totalRefunded: number;
  netCollected: number;
  patients: TodayPatientRow[];
};

export async function generateTodayReport(
  dateStr: string,
): Promise<{ ok: true; data: TodayReport } | { ok: false; error: string }> {
  try {
    await verifySession();
    const { start, end } = dayBounds(dateStr);

    const [patients, collected, refunded] = await Promise.all([
      prisma.patient.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: {
          doctor: { select: { name: true } },
          tests: { select: { testName: true } },
          consultations: { select: { name: true } },
          payments: { select: { amount: true, refundedAt: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payment.aggregate({
        where: { createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { refundedAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    const testsOrdered = patients.reduce((s, p) => s + p.tests.length, 0);
    const totalCollected = collected._sum.amount ?? 0;
    const totalRefunded = refunded._sum.amount ?? 0;

    return {
      ok: true,
      data: {
        date: dateStr,
        patientsRegistered: patients.length,
        testsOrdered,
        totalCollected,
        totalRefunded,
        netCollected: totalCollected - totalRefunded,
        patients: patients.map((p) => ({
          mrNumber: p.mrNumber ?? "—",
          name: p.name,
          doctor: p.doctor?.name ?? null,
          items: [
            ...p.tests.map((t) => t.testName),
            ...p.consultations.map((c) => c.name),
          ],
          paid: p.payments.reduce(
            (s, pm) => s + (pm.refundedAt ? 0 : pm.amount),
            0,
          ),
        })),
      },
    };
  } catch {
    return { ok: false, error: "Failed to generate report." };
  }
}

// ─── Fee Return Report ────────────────────────────────────────────────────────

export type ReturnRow = {
  mrNumber: string;
  name: string;
  amount: number;
  refundedAt: string; // ISO string
};

export type ReturnReport = {
  from: string;
  to: string;
  totalReturns: number;
  totalAmount: number;
  rows: ReturnRow[];
};

export async function generateReturnReport(
  from: string,
  to: string,
): Promise<{ ok: true; data: ReturnReport } | { ok: false; error: string }> {
  try {
    await verifySession();
    const start = new Date(`${from}T00:00:00+05:00`);
    const end = new Date(`${to}T23:59:59.999+05:00`);

    const payments = await prisma.payment.findMany({
      where: { refundedAt: { gte: start, lte: end } },
      include: { patient: { select: { mrNumber: true, name: true } } },
      orderBy: { refundedAt: "asc" },
    });

    const rows: ReturnRow[] = payments.map((p) => ({
      mrNumber: p.patient.mrNumber ?? "—",
      name: p.patient.name,
      amount: p.amount,
      refundedAt: p.refundedAt!.toISOString(),
    }));

    return {
      ok: true,
      data: {
        from,
        to,
        totalReturns: rows.length,
        totalAmount: rows.reduce((s, r) => s + r.amount, 0),
        rows,
      },
    };
  } catch {
    return { ok: false, error: "Failed to generate report." };
  }
}

// ─── Test Report ─────────────────────────────────────────────────────────────

export type TestBreakdownRow = {
  testName: string;
  count: number;
  rate: number;
  revenue: number;
};

export type TestReport = {
  from: string;
  to: string;
  totalTests: number;
  totalRevenue: number;
  breakdown: TestBreakdownRow[];
};

export async function generateTestReport(
  from: string,
  to: string,
): Promise<{ ok: true; data: TestReport } | { ok: false; error: string }> {
  try {
    await verifySession();
    const start = new Date(`${from}T00:00:00+05:00`);
    const end = new Date(`${to}T23:59:59.999+05:00`);

    const tests = await prisma.patientTest.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { testName: true, rate: true },
    });

    const map = new Map<string, { count: number; rate: number; revenue: number }>();
    for (const t of tests) {
      const existing = map.get(t.testName);
      if (existing) {
        existing.count++;
        existing.revenue += t.rate;
      } else {
        map.set(t.testName, { count: 1, rate: t.rate, revenue: t.rate });
      }
    }

    const breakdown = Array.from(map.entries())
      .map(([testName, d]) => ({ testName, ...d }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      ok: true,
      data: {
        from,
        to,
        totalTests: tests.length,
        totalRevenue: tests.reduce((s, t) => s + t.rate, 0),
        breakdown,
      },
    };
  } catch {
    return { ok: false, error: "Failed to generate report." };
  }
}
