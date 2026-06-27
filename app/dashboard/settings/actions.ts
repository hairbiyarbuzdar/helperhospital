"use server";

import bcrypt from "bcryptjs";
import { execSync } from "child_process";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { logActivity } from "@/lib/activity";

export type PasswordState = { ok?: boolean; error?: string } | undefined;

export async function changePassword(
  _state: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await verifySession();

  const current = String(formData.get("current") ?? "").trim();
  const next = String(formData.get("password") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (!current || !next || !confirm) return { error: "Fill in all fields." };
  if (next.length < 6) return { error: "New password must be at least 6 characters." };
  if (next !== confirm) return { error: "Passwords do not match." };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "User not found." };

  const valid = await bcrypt.compare(current, user.password);
  if (!valid) return { error: "Current password is incorrect." };

  await prisma.user.update({
    where: { id: session.userId },
    data: { password: await bcrypt.hash(next, 10) },
  });

  await logActivity({
    action: "PASSWORD_CHANGED",
    description: `${user.username} changed their password`,
  });

  return { ok: true };
}

export async function getSystemPrinters(): Promise<string[]> {
  try {
    if (process.platform !== "win32") return [];
    const raw = execSync(
      'powershell -NonInteractive -Command "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress"',
      { timeout: 6000, encoding: "utf8" },
    ).trim();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
    if (typeof parsed === "string") return [parsed];
    return [];
  } catch {
    return [];
  }
}
