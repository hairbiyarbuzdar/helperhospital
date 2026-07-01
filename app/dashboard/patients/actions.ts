"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifySession, getUser } from "@/lib/dal";
import { logActivity } from "@/lib/activity";

export type ActionState = { ok?: boolean; error?: string } | undefined;

export type SlipItem = { name: string; amount: number };
export type SlipData = {
  mrNumber: string;
  receiptNo: number | null;
  name: string;
  gender: string;
  age: number;
  cnic: string | null;
  doctor: string | null;
  createdAt: string; // ISO timestamp
  items: SlipItem[];
  total: number;
  slipMadeBy: string | null; // username of the staff who made the slip
};

// The display name of the currently signed-in user, for the "Slip Made By" line.
async function currentUserName(): Promise<string | null> {
  const user = await getUser();
  return user?.name ?? user?.username ?? null;
}
export type BillingResult =
  | { ok?: boolean; error?: string; slip?: SlipData }
  | undefined;

export type BillingItem = { testId: string; rate: number };
export type ConsultItem = { feeId: string; rate: number };

export type BillingInput = {
  name: string;
  age: number | string;
  gender: string;
  mobile?: string;
  cnic?: string;
  doctorId?: string;
  items: BillingItem[];
  consultations: ConsultItem[];
};

const GENDER_LABEL: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

const rate = z.coerce
  .number({ error: "Rate must be a number." })
  .int({ error: "Rate must be a whole number." })
  .min(0, { error: "Rate cannot be negative." });

const testItemsSchema = z
  .array(z.object({ testId: z.string().min(1), rate }))
  .default([]);
const consultItemsSchema = z
  .array(z.object({ feeId: z.string().min(1), rate }))
  .default([]);

const Schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100)
    .transform((s) => s.toUpperCase()),
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
  items: testItemsSchema,
  consultations: consultItemsSchema,
});

export async function createPatientWithBilling(
  input: BillingInput,
): Promise<BillingResult> {
  await verifySession();

  const parsed = Schema.safeParse({
    name: input.name,
    age: input.age,
    gender: input.gender,
    mobile: input.mobile?.trim() || undefined,
    cnic: input.cnic?.trim() || undefined,
    doctorId: input.doctorId || undefined,
    items: (input.items ?? []).filter((i) => i.testId),
    consultations: (input.consultations ?? []).filter((c) => c.feeId),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, age, gender, mobile, cnic, doctorId, items, consultations } =
    parsed.data;

  let doctorName: string | null = null;
  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return { error: "Selected doctor not found." };
    doctorName = doctor.name;
  }

  const testNames = await resolveTests(items);
  if (testNames === null) {
    return { error: "One of the selected tests no longer exists." };
  }
  const feeNames = await resolveFees(consultations);
  if (feeNames === null) {
    return { error: "One of the selected consultation fees no longer exists." };
  }

  const slipItems = buildSlipItems(items, testNames, consultations, feeNames);
  const total = slipItems.reduce((s, i) => s + i.amount, 0);
  const paid = total > 0;

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.patient.create({
      data: { name, age, gender, mobile, cnic, doctorId },
    });
    // MR number is simply the patient's sequential serial (1, 2, 3, …).
    const pktYear = new Date(Date.now() + 5 * 60 * 60 * 1000).getUTCFullYear();
    const patient = await tx.patient.update({
      where: { id: created.id },
      data: { mrNumber: `${String(created.serial).padStart(4, "0")}-${pktYear}` },
    });

    if (items.length > 0) {
      await tx.patientTest.createMany({
        data: items.map((i) => ({
          patientId: patient.id,
          testId: i.testId,
          testName: testNames.get(i.testId) ?? "Test",
          rate: i.rate,
          payment: paid ? ("PAID" as const) : ("UNPAID" as const),
        })),
      });
    }
    if (consultations.length > 0) {
      await tx.patientConsultation.createMany({
        data: consultations.map((c) => ({
          patientId: patient.id,
          feeId: c.feeId,
          name: feeNames.get(c.feeId) ?? "Consultation",
          rate: c.rate,
        })),
      });
    }

    let receiptNo: number | null = null;
    let createdAt = patient.createdAt;
    if (total > 0) {
      const payment = await tx.payment.create({
        data: { patientId: patient.id, amount: total },
      });
      receiptNo = payment.receiptNo;
      createdAt = payment.createdAt;
    }

    return { mrNumber: patient.mrNumber!, receiptNo, createdAt };
  });

  await logActivity({
    action: "PATIENT_CREATED",
    description: `Registered patient ${name}`,
    mrNumber: result.mrNumber,
  });

  revalidatePath("/dashboard/patients");
  revalidatePath("/dashboard/tests");

  return {
    ok: true,
    slip: {
      mrNumber: result.mrNumber,
      receiptNo: result.receiptNo,
      name,
      gender: GENDER_LABEL[gender] ?? gender,
      age,
      cnic: cnic ?? null,
      doctor: doctorName,
      createdAt: result.createdAt.toISOString(),
      items: slipItems,
      total,
      slipMadeBy: await currentUserName(),
    },
  };
}

export async function deletePatient(id: string) {
  await verifySession();
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: { name: true, mrNumber: true },
  });
  await prisma.patient.delete({ where: { id } });
  await logActivity({
    action: "PATIENT_DELETED",
    description: `Deleted patient ${patient?.name ?? ""}`.trim(),
    mrNumber: patient?.mrNumber ?? null,
  });
  revalidatePath("/dashboard/patients");
}

export type UpdatePatientInput = {
  id: string;
  name: string;
  age: number | string;
  gender: string;
  mobile?: string;
  cnic?: string;
  doctorId?: string;
};

const UpdateSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100)
    .transform((s) => s.toUpperCase()),
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
});

export async function updatePatient(
  input: UpdatePatientInput,
): Promise<ActionState> {
  await verifySession();

  const parsed = UpdateSchema.safeParse({
    id: input.id,
    name: input.name,
    age: input.age,
    gender: input.gender,
    mobile: input.mobile?.trim() || undefined,
    cnic: input.cnic?.trim() || undefined,
    doctorId: input.doctorId || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { id, name, age, gender, mobile, cnic, doctorId } = parsed.data;

  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return { error: "Selected doctor not found." };
  }

  const updated = await prisma.patient.update({
    where: { id },
    data: {
      name,
      age,
      gender,
      mobile: mobile ?? null,
      cnic: cnic ?? null,
      doctorId: doctorId ?? null,
    },
  });

  await logActivity({
    action: "PATIENT_UPDATED",
    description: `Updated patient ${updated.name}`,
    mrNumber: updated.mrNumber,
  });

  revalidatePath("/dashboard/patients");
  return { ok: true };
}

// Rebuild a printable slip for an existing patient (all their tests +
// consultations, with the latest receipt number).
export async function getPatientSlip(
  patientId: string,
): Promise<SlipData | null> {
  await verifySession();

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      doctor: { select: { name: true } },
      tests: { orderBy: { createdAt: "asc" } },
      consultations: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!patient) return null;

  const payment = await prisma.payment.findFirst({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });

  const items: SlipItem[] = [
    ...patient.tests.map((t) => ({ name: t.testName, amount: t.rate })),
    ...patient.consultations.map((c) => ({ name: c.name, amount: c.rate })),
  ];

  return {
    mrNumber: patient.mrNumber ?? "—",
    receiptNo: payment?.receiptNo ?? null,
    name: patient.name,
    gender: GENDER_LABEL[patient.gender] ?? patient.gender,
    age: patient.age,
    cnic: patient.cnic,
    doctor: patient.doctor?.name ?? null,
    createdAt: patient.createdAt.toISOString(),
    items,
    total: items.reduce((s, i) => s + i.amount, 0),
    slipMadeBy: await currentUserName(),
  };
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
  consultations: ConsultItem[];
};

const ChargeSchema = z.object({
  patientId: z.string().min(1, { error: "Select a patient." }),
  items: testItemsSchema,
  consultations: consultItemsSchema,
});

// Add tests + consultations and collect payment for an existing patient.
export async function chargeExistingPatient(
  input: ChargeInput,
): Promise<BillingResult> {
  await verifySession();

  const parsed = ChargeSchema.safeParse({
    patientId: input.patientId,
    items: (input.items ?? []).filter((i) => i.testId),
    consultations: (input.consultations ?? []).filter((c) => c.feeId),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { patientId, items, consultations } = parsed.data;

  if (items.length === 0 && consultations.length === 0) {
    return { error: "Add at least one test or consultation fee." };
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { doctor: { select: { name: true } } },
  });
  if (!patient) return { error: "Patient not found." };

  const testNames = await resolveTests(items);
  if (testNames === null) {
    return { error: "One of the selected tests no longer exists." };
  }
  const feeNames = await resolveFees(consultations);
  if (feeNames === null) {
    return { error: "One of the selected consultation fees no longer exists." };
  }

  const slipItems = buildSlipItems(items, testNames, consultations, feeNames);
  const total = slipItems.reduce((s, i) => s + i.amount, 0);
  const paid = total > 0;

  const result = await prisma.$transaction(async (tx) => {
    if (items.length > 0) {
      await tx.patientTest.createMany({
        data: items.map((i) => ({
          patientId: patient.id,
          testId: i.testId,
          testName: testNames.get(i.testId) ?? "Test",
          rate: i.rate,
          payment: paid ? ("PAID" as const) : ("UNPAID" as const),
        })),
      });
    }
    if (consultations.length > 0) {
      await tx.patientConsultation.createMany({
        data: consultations.map((c) => ({
          patientId: patient.id,
          feeId: c.feeId,
          name: feeNames.get(c.feeId) ?? "Consultation",
          rate: c.rate,
        })),
      });
    }

    let receiptNo: number | null = null;
    let createdAt = new Date();
    if (total > 0) {
      const payment = await tx.payment.create({
        data: { patientId: patient.id, amount: total },
      });
      receiptNo = payment.receiptNo;
      createdAt = payment.createdAt;
    }
    return { receiptNo, createdAt };
  });

  await logActivity({
    action: "TESTS_ADDED",
    description: `Added ${items.length + consultations.length} item(s) for patient`,
    mrNumber: patient.mrNumber,
  });

  revalidatePath("/dashboard/patients");
  revalidatePath("/dashboard/tests");

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
      slipMadeBy: await currentUserName(),
    },
  };
}

function buildSlipItems(
  items: BillingItem[],
  testNames: Map<string, string>,
  consultations: ConsultItem[],
  feeNames: Map<string, string>,
): SlipItem[] {
  return [
    ...items.map((i) => ({
      name: testNames.get(i.testId) ?? "Test",
      amount: i.rate,
    })),
    ...consultations.map((c) => ({
      name: feeNames.get(c.feeId) ?? "Consultation",
      amount: c.rate,
    })),
  ];
}

// Validate selected catalog tests exist; returns id->name, or null if missing.
async function resolveTests(
  items: BillingItem[],
): Promise<Map<string, string> | null> {
  if (items.length === 0) return new Map();
  const catalog = await prisma.testCatalog.findMany({
    where: { id: { in: items.map((i) => i.testId) } },
    select: { id: true, name: true },
  });
  const known = new Set(catalog.map((c) => c.id));
  if (items.some((i) => !known.has(i.testId))) return null;
  return new Map(catalog.map((c) => [c.id, c.name]));
}

// Validate selected consultation fees exist; returns id->name, or null.
async function resolveFees(
  items: ConsultItem[],
): Promise<Map<string, string> | null> {
  if (items.length === 0) return new Map();
  const catalog = await prisma.consultationFee.findMany({
    where: { id: { in: items.map((i) => i.feeId) } },
    select: { id: true, name: true },
  });
  const known = new Set(catalog.map((c) => c.id));
  if (items.some((i) => !known.has(i.feeId))) return null;
  return new Map(catalog.map((c) => [c.id, c.name]));
}
