"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { formatRs } from "@/lib/format";

export type ReturnState =
  | { ok?: boolean; message?: string; error?: string }
  | undefined;

function revalidate() {
  revalidatePath("/dashboard/returns");
  revalidatePath("/dashboard");
}

// Refund a patient's most recent collected fee, found by MR number.
export async function returnFeeByMr(
  _state: ReturnState,
  formData: FormData,
): Promise<ReturnState> {
  await verifySession();

  const mr = String(formData.get("mr") ?? "").trim();
  if (!mr) return { error: "Enter an MR number." };

  const patient = await prisma.patient.findUnique({ where: { mrNumber: mr } });
  if (!patient) return { error: `No patient found with MR "${mr}".` };

  const payment = await prisma.payment.findFirst({
    where: { patientId: patient.id, refundedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) {
    return { error: `No refundable fee found for ${patient.name} (${mr}).` };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { refundedAt: new Date() },
  });

  revalidate();
  return {
    ok: true,
    message: `Returned ${formatRs(payment.amount)} to ${patient.name} (${mr}).`,
  };
}

// Refund a specific payment (used by the per-row button).
export async function returnFee(paymentId: string) {
  await verifySession();

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.refundedAt) return;

  await prisma.payment.update({
    where: { id: paymentId },
    data: { refundedAt: new Date() },
  });

  revalidate();
}
