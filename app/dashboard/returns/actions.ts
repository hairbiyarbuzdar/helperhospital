"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { logActivity } from "@/lib/activity";
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

  const reason = String(formData.get("reason") ?? "").trim() || null;

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

  const description = reason
    ? `Returned ${formatRs(payment.amount)} to ${patient.name} — ${reason}`
    : `Returned ${formatRs(payment.amount)} to ${patient.name}`;

  await logActivity({ action: "FEE_RETURNED", description, mrNumber: mr });

  revalidate();
  return {
    ok: true,
    message: `Returned ${formatRs(payment.amount)} to ${patient.name} (${mr}).`,
  };
}

// Refund a specific payment (used by the per-row Return button).
export async function returnFee(
  paymentId: string,
  reason?: string,
): Promise<{ error?: string } | undefined> {
  await verifySession();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { patient: { select: { name: true, mrNumber: true } } },
  });
  if (!payment || payment.refundedAt) return;

  await prisma.payment.update({
    where: { id: paymentId },
    data: { refundedAt: new Date() },
  });

  const trimmedReason = reason?.trim() || null;
  const description = trimmedReason
    ? `Returned ${formatRs(payment.amount)} to ${payment.patient.name} — ${trimmedReason}`
    : `Returned ${formatRs(payment.amount)} to ${payment.patient.name}`;

  await logActivity({
    action: "FEE_RETURNED",
    description,
    mrNumber: payment.patient.mrNumber,
  });

  revalidate();
}
