"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type ActionState = { ok?: boolean; error?: string } | undefined;

const MethodSchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required." }).max(60),
  openingBalance: z.coerce
    .number({ error: "Opening balance must be a number." })
    .int({ error: "Opening balance must be a whole number." })
    .min(0, { error: "Opening balance cannot be negative." }),
});

const TransferSchema = z
  .object({
    fromId: z.string().min(1, { error: "Select a source method." }),
    toId: z.string().min(1, { error: "Select a destination method." }),
    amount: z.coerce
      .number({ error: "Amount must be a number." })
      .int({ error: "Amount must be a whole number." })
      .positive({ error: "Amount must be greater than zero." }),
    note: z.string().trim().max(200).optional(),
  })
  .refine((d) => d.fromId !== d.toId, {
    error: "Source and destination must be different.",
    path: ["toId"],
  });

export async function createPaymentMethod(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();

  const parsed = MethodSchema.safeParse({
    name: formData.get("name"),
    openingBalance: formData.get("openingBalance"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.paymentMethod.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return { error: "A method with this name already exists." };
  }

  await prisma.paymentMethod.create({
    data: {
      name: parsed.data.name,
      openingBalance: parsed.data.openingBalance,
    },
  });

  revalidatePath("/dashboard/payments");
  return { ok: true };
}

export async function deletePaymentMethod(id: string) {
  await verifySession();
  await prisma.paymentMethod.delete({ where: { id } });
  revalidatePath("/dashboard/payments");
}

export async function transferFunds(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await verifySession();

  const parsed = TransferSchema.safeParse({
    fromId: formData.get("fromId"),
    toId: formData.get("toId"),
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.transfer.create({
    data: {
      fromId: parsed.data.fromId,
      toId: parsed.data.toId,
      amount: parsed.data.amount,
      note: parsed.data.note,
    },
  });

  revalidatePath("/dashboard/payments");
  return { ok: true };
}
