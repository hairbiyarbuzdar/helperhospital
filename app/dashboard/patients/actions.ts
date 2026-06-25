"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type ActionState = { ok?: boolean; error?: string } | undefined;

export type BillingItem = { testId: string; rate: number };
export type BillingInput = {
  name: string;
  age: number | string;
  gender: string;
  mobile?: string;
  cnic?: string;
  doctorId?: string;
  items: BillingItem[];
  paymentMethodId?: string;
};

const Schema = z.object({
  name: z.string().trim().min(1, { error: "Name is required." }).max(100),
  age: z.coerce
    .number({ error: "Age must be a number." })
    .int({ error: "Age must be a whole number." })
    .min(0, { error: "Age cannot be negative." })
    .max(150, { error: "Enter a valid age." }),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { error: "Select a gender." }),
  mobile: z
    .string()
    .trim()
    .regex(/^\d{11}$/, { error: "Mobile number must be exactly 11 digits." })
    .optional(),
  cnic: z.string().trim().max(20).optional(),
  doctorId: z.string().optional(),
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
    .default([]),
  paymentMethodId: z.string().optional(),
});

export async function createPatientWithBilling(
  input: BillingInput,
): Promise<ActionState> {
  await verifySession();

  // Normalise empty strings to undefined before validation.
  const parsed = Schema.safeParse({
    name: input.name,
    age: input.age,
    gender: input.gender,
    mobile: input.mobile?.trim() || undefined,
    cnic: input.cnic?.trim() || undefined,
    doctorId: input.doctorId || undefined,
    items: (input.items ?? []).filter((i) => i.testId),
    paymentMethodId: input.paymentMethodId || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, age, gender, mobile, cnic, doctorId, items, paymentMethodId } =
    parsed.data;

  // Validate the doctor, the selected tests, and compute the total.
  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return { error: "Selected doctor not found." };
  }

  let catalog: { id: string; name: string }[] = [];
  if (items.length > 0) {
    catalog = await prisma.testCatalog.findMany({
      where: { id: { in: items.map((i) => i.testId) } },
      select: { id: true, name: true },
    });
    const known = new Set(catalog.map((c) => c.id));
    if (items.some((i) => !known.has(i.testId))) {
      return { error: "One of the selected tests no longer exists." };
    }
  }
  const nameById = new Map(catalog.map((c) => [c.id, c.name]));

  const total = items.reduce((s, i) => s + i.rate, 0);

  let method = null;
  if (total > 0) {
    if (!paymentMethodId) {
      return { error: "Select a payment method to collect the charges." };
    }
    method = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });
    if (!method) return { error: "Selected payment method not found." };
  }

  const paid = method != null;

  await prisma.$transaction(async (tx) => {
    const patient = await tx.patient.create({
      data: { name, age, gender, mobile, cnic, doctorId },
    });
    // MR number is simply the patient's sequential serial (1, 2, 3, …).
    await tx.patient.update({
      where: { id: patient.id },
      data: { mrNumber: String(patient.serial) },
    });

    if (items.length > 0) {
      await tx.patientTest.createMany({
        data: items.map((i) => ({
          patientId: patient.id,
          testId: i.testId,
          testName: nameById.get(i.testId) ?? "Test",
          rate: i.rate,
          payment: paid ? ("PAID" as const) : ("UNPAID" as const),
        })),
      });
    }

    if (method && total > 0) {
      await tx.payment.create({
        data: {
          patientId: patient.id,
          paymentMethodId: method.id,
          amount: total,
        },
      });
    }
  });

  revalidatePath("/dashboard/patients");
  revalidatePath("/dashboard/tests");
  revalidatePath("/dashboard/payments");
  return { ok: true };
}

export async function deletePatient(id: string) {
  await verifySession();
  await prisma.patient.delete({ where: { id } });
  revalidatePath("/dashboard/patients");
}

export type PatientHit = {
  id: string;
  mrNumber: string | null;
  name: string;
};

// Search existing patients by MR number or name; empty query returns the most
// recently added patients. Used by the "existing patient" combobox.
export async function searchPatients(query: string): Promise<PatientHit[]> {
  await verifySession();
  const q = query.trim();
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { mrNumber: { contains: q } },
        ],
      }
    : {};
  return prisma.patient.findMany({
    where,
    orderBy: { serial: "desc" },
    take: 10,
    select: { id: true, mrNumber: true, name: true },
  });
}

export type ChargeInput = {
  patientId: string;
  items: BillingItem[];
  paymentMethodId?: string;
};

const ChargeSchema = z.object({
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
    .default([]),
  paymentMethodId: z.string().optional(),
});

// Add tests + collect payment for an already-registered patient.
export async function chargeExistingPatient(
  input: ChargeInput,
): Promise<ActionState> {
  await verifySession();

  const parsed = ChargeSchema.safeParse({
    patientId: input.patientId,
    items: (input.items ?? []).filter((i) => i.testId),
    paymentMethodId: input.paymentMethodId || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { patientId, items, paymentMethodId } = parsed.data;

  if (items.length === 0) {
    return { error: "Add at least one test." };
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return { error: "Patient not found." };

  const catalog = await prisma.testCatalog.findMany({
    where: { id: { in: items.map((i) => i.testId) } },
    select: { id: true, name: true },
  });
  const known = new Set(catalog.map((c) => c.id));
  if (items.some((i) => !known.has(i.testId))) {
    return { error: "One of the selected tests no longer exists." };
  }
  const nameById = new Map(catalog.map((c) => [c.id, c.name]));

  const total = items.reduce((s, i) => s + i.rate, 0);

  let method = null;
  if (total > 0) {
    if (!paymentMethodId) {
      return { error: "Select a payment method to collect the charges." };
    }
    method = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });
    if (!method) return { error: "Selected payment method not found." };
  }
  const paid = method != null;

  await prisma.$transaction(async (tx) => {
    await tx.patientTest.createMany({
      data: items.map((i) => ({
        patientId: patient.id,
        testId: i.testId,
        testName: nameById.get(i.testId) ?? "Test",
        rate: i.rate,
        payment: paid ? ("PAID" as const) : ("UNPAID" as const),
      })),
    });

    if (method && total > 0) {
      await tx.payment.create({
        data: {
          patientId: patient.id,
          paymentMethodId: method.id,
          amount: total,
        },
      });
    }
  });

  revalidatePath("/dashboard/patients");
  revalidatePath("/dashboard/tests");
  revalidatePath("/dashboard/payments");
  return { ok: true };
}
