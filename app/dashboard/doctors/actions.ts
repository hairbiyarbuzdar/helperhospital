"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type ActionState = { ok?: boolean; error?: string } | undefined;

const DoctorSchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required." }).max(100),
  mobile: z
    .string()
    .trim()
    .regex(/^\d{11}$/, { error: "Mobile number must be exactly 11 digits." })
    .optional(),
  fee: z.coerce
    .number({ error: "Fee must be a number." })
    .int({ error: "Fee must be a whole number." })
    .min(0, { error: "Fee cannot be negative." })
    .optional(),
  isActive: z.boolean(),
});

export async function createDoctor(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();

  const parsed = DoctorSchema.safeParse({
    name: formData.get("name"),
    mobile: formData.get("mobile") || undefined,
    fee: formData.get("fee") || undefined,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.doctor.create({ data: parsed.data });

  revalidatePath("/dashboard/doctors");
  return { ok: true };
}

const UpdateDoctorSchema = DoctorSchema.extend({ id: z.string().min(1) });

export async function updateDoctor(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();

  const parsed = UpdateDoctorSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    mobile: formData.get("mobile") || undefined,
    fee: formData.get("fee") || undefined,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { id, name, mobile, fee, isActive } = parsed.data;
  await prisma.doctor.update({
    where: { id },
    data: { name, mobile: mobile ?? null, fee: fee ?? null, isActive },
  });

  revalidatePath("/dashboard/doctors");
  return { ok: true };
}

export async function deleteDoctor(id: string) {
  await verifySession();
  await prisma.doctor.delete({ where: { id } });
  revalidatePath("/dashboard/doctors");
}
