"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifySession, getUser } from "@/lib/dal";
import { logActivity } from "@/lib/activity";
import type { SlipData, SlipItem } from "../patients/actions";

export type ActionState = { ok?: boolean; error?: string } | undefined;
export type OrderResult =
  | { ok?: boolean; error?: string; slip?: SlipData }
  | undefined;

const GENDER_LABEL: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

/* ----------------------------- Test Catalog ----------------------------- */

const CatalogSchema = z.object({
  name: z.string().trim().min(1, { error: "Test name is required." }).max(100),
  rate: z.coerce
    .number({ error: "Rate must be a number." })
    .int({ error: "Rate must be a whole number." })
    .min(0, { error: "Rate cannot be negative." }),
});

export async function createCatalogTest(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();

  const parsed = CatalogSchema.safeParse({
    name: formData.get("name"),
    rate: formData.get("rate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.testCatalog.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return { error: "A test with this name already exists." };
  }

  await prisma.testCatalog.create({ data: parsed.data });
  revalidatePath("/dashboard/tests");
  return { ok: true };
}

export async function deleteCatalogTest(id: string) {
  await verifySession();
  await prisma.testCatalog.delete({ where: { id } });
  revalidatePath("/dashboard/tests");
}

/* ----------------------------- Patient Tests ---------------------------- */

export type OrderItem = { testId: string; rate: number };
export type OrderInput = { patientId: string; items: OrderItem[] };

const OrderSchema = z.object({
  patientId: z.string().min(1, { error: "Select a patient." }),
  items: z
    .array(
      z.object({
        testId: z.string().min(1),
        rate: z.coerce
          .number({ error: "Rate must be a number." })
          .int({ error: "Rate must be a whole number." })
          .min(0, { error: "Rate cannot be negative." }),
      }),
    )
    .min(1, { error: "Add at least one test." }),
});

export async function createPatientTests(
  input: OrderInput,
): Promise<OrderResult> {
  await verifySession();

  const parsed = OrderSchema.safeParse({
    patientId: input.patientId,
    items: (input.items ?? []).filter((i) => i.testId),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { patientId, items } = parsed.data;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { doctor: { select: { name: true } } },
  });
  if (!patient) return { error: "Patient not found." };

  const catalog = await prisma.testCatalog.findMany({
    where: { id: { in: items.map((i) => i.testId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(catalog.map((c) => [c.id, c.name]));
  if (items.some((i) => !nameById.has(i.testId))) {
    return { error: "One of the selected tests no longer exists." };
  }

  const slipItems: SlipItem[] = items.map((i) => ({
    name: nameById.get(i.testId) ?? "Test",
    amount: i.rate,
  }));
  const total = slipItems.reduce((s, i) => s + i.amount, 0);
  const paid = total > 0;

  const result = await prisma.$transaction(async (tx) => {
    // Snapshot the name + (possibly discounted) rate per test.
    await tx.patientTest.createMany({
      data: items.map((i) => ({
        patientId,
        testId: i.testId,
        testName: nameById.get(i.testId) ?? "Test",
        rate: i.rate,
        payment: paid ? ("PAID" as const) : ("UNPAID" as const),
      })),
    });

    let receiptNo: number | null = null;
    let createdAt = new Date();
    if (total > 0) {
      const payment = await tx.payment.create({
        data: { patientId, amount: total },
      });
      receiptNo = payment.receiptNo;
      createdAt = payment.createdAt;
    }
    return { receiptNo, createdAt };
  });

  await logActivity({
    action: "TESTS_ORDERED",
    description: `Ordered ${items.length} test(s)`,
    mrNumber: patient.mrNumber,
  });

  revalidatePath("/dashboard/tests");
  revalidatePath("/dashboard/patients");
  revalidatePath("/dashboard");

  return {
    ok: true,
    slip: {
      mrNumber: patient.mrNumber ?? "—",
      receiptNo: result.receiptNo,
      name: patient.name,
      gender: GENDER_LABEL[patient.gender] ?? patient.gender,
      age: patient.age,
      cnic: patient.cnic,
      doctor: patient.doctor?.name ?? null,
      createdAt: result.createdAt.toISOString(),
      items: slipItems,
      total,
      slipMadeBy: (await getUser())?.name ?? (await getUser())?.username ?? null,
    },
  };
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
  payment: z.enum(["UNPAID", "PAID"]),
  result: z.string().trim().max(2000).optional(),
});

export async function updatePatientTest(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();

  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    payment: formData.get("payment"),
    result: formData.get("result") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { id, status, payment, result } = parsed.data;
  await prisma.patientTest.update({
    where: { id },
    data: { status, payment, result: result ?? null },
  });

  revalidatePath("/dashboard/tests");
  return { ok: true };
}

export async function deletePatientTest(id: string) {
  await verifySession();
  await prisma.patientTest.delete({ where: { id } });
  revalidatePath("/dashboard/tests");
}
