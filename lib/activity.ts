import "server-only";
import prisma from "./prisma";
import { getUser } from "./dal";

// Best-effort audit logging — records who did what, with the patient MR for
// search. Never throws (logging must not break the underlying action).
export async function logActivity(params: {
  action: string;
  description: string;
  mrNumber?: string | null;
}) {
  try {
    const user = await getUser();
    await prisma.activityLog.create({
      data: {
        action: params.action,
        description: params.description,
        mrNumber: params.mrNumber ?? null,
        userId: user?.id ?? null,
        userName: user?.username ?? null,
      },
    });
  } catch {
    // ignore logging failures
  }
}
