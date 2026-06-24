"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type ActionState = { ok?: boolean; error?: string } | undefined;

const DoctorSchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required." }).max(100),
  specialty: z.string().trim().max(80).optional(),
  qualification: z.string().trim().max(80).optional(),
  mobile: z
    .string()
    .trim()
    .regex(/^\d{11}$/, { error: "Mobile number must be exactly 11 digits." })
    .optional(),
  email: z.email({ error: "Enter a valid email." }).optional(),
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
    specialty: formData.get("specialty") || undefined,
    qualification: formData.get("qualification") || undefined,
    mobile: formData.get("mobile") || undefined,
    email: formData.get("email") || undefined,
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

export async function deleteDoctor(id: string) {
  await verifySession();
  await prisma.doctor.delete({ where: { id } });
  revalidatePath("/dashboard/doctors");
}
