"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type ActionState = { ok?: boolean; error?: string } | undefined;

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

const OrderSchema = z.object({
  patientId: z.string().min(1, { error: "Select a patient." }),
  testId: z.string().min(1, { error: "Select a test." }),
});

export async function createPatientTest(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();

  const parsed = OrderSchema.safeParse({
    patientId: formData.get("patientId"),
    testId: formData.get("testId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const test = await prisma.testCatalog.findUnique({
    where: { id: parsed.data.testId },
  });
  if (!test) {
    return { error: "Selected test no longer exists." };
  }

  // Snapshot the name + rate so the order stays accurate if the catalog changes.
  await prisma.patientTest.create({
    data: {
      patientId: parsed.data.patientId,
      testId: test.id,
      testName: test.name,
      rate: test.rate,
    },
  });

  revalidatePath("/dashboard/tests");
  return { ok: true };
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
