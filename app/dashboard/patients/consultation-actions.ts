"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type ActionState = { ok?: boolean; error?: string } | undefined;

const FeeSchema = z.object({
  name: z.string().trim().min(1, { error: "Fee name is required." }).max(100),
  rate: z.coerce
    .number({ error: "Rate must be a number." })
    .int({ error: "Rate must be a whole number." })
    .min(0, { error: "Rate cannot be negative." }),
});

export async function createConsultationFee(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();

  const parsed = FeeSchema.safeParse({
    name: formData.get("name"),
    rate: formData.get("rate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.consultationFee.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return { error: "A consultation fee with this name already exists." };
  }

  await prisma.consultationFee.create({ data: parsed.data });
  revalidatePath("/dashboard/patients");
  return { ok: true };
}

export async function deleteConsultationFee(id: string) {
  await verifySession();
  await prisma.consultationFee.delete({ where: { id } });
  revalidatePath("/dashboard/patients");
}
