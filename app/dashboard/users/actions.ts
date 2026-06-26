"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { logActivity } from "@/lib/activity";
import { ROLE_LABEL } from "./constants";

export type UserActionState = { ok?: boolean; error?: string } | undefined;

const CreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { error: "Username must be at least 3 characters." })
    .max(40)
    .regex(/^\w+$/, { error: "Username can only contain letters, numbers, and underscores." }),
  name: z.string().trim().max(80).optional(),
  password: z
    .string()
    .min(6, { error: "Password must be at least 6 characters." })
    .max(100),
  role: z.enum(["DOCTOR", "NURSE", "RECEPTIONIST", "PHARMACIST"], {
    error: "Select a valid staff role.",
  }),
});

export async function createUser(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const session = await verifySession();
  if (session.role !== "ADMIN") {
    return { error: "Only admins can create users." };
  }

  const parsed = CreateSchema.safeParse({
    username: formData.get("username"),
    name: formData.get("name") || undefined,
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { username, name, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return { error: "Username already taken." };

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { username, name: name ?? null, password: hashed, role },
  });

  await logActivity({ action: "USER_CREATED", description: `Created user "${username}" (${ROLE_LABEL[role]})` });

  revalidatePath("/dashboard/users");
  return { ok: true };
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().max(80).optional(),
  password: z
    .string()
    .min(6, { error: "Password must be at least 6 characters." })
    .max(100)
    .optional(),
  role: z.enum(["DOCTOR", "NURSE", "RECEPTIONIST", "PHARMACIST"], {
    error: "Select a valid staff role.",
  }),
  isActive: z.boolean(),
});

export async function updateUser(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const session = await verifySession();
  if (session.role !== "ADMIN") {
    return { error: "Only admins can update users." };
  }

  const rawPassword = String(formData.get("password") ?? "").trim();
  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    password: rawPassword || undefined,
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { id, name, password, role, isActive } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };
  if (user.role === "ADMIN") return { error: "Cannot edit the admin account here." };

  const data: Record<string, unknown> = { name: name ?? null, role, isActive };
  if (password) data.password = await bcrypt.hash(password, 10);

  await prisma.user.update({ where: { id }, data });
  await logActivity({ action: "USER_UPDATED", description: `Updated user "${user.username}"` });

  revalidatePath("/dashboard/users");
  return { ok: true };
}

export async function deleteUser(id: string): Promise<UserActionState> {
  const session = await verifySession();
  if (session.role !== "ADMIN") return { error: "Only admins can delete users." };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };
  if (user.role === "ADMIN") return { error: "Cannot delete the admin account." };
  if (user.id === session.userId) return { error: "You cannot delete your own account." };

  await prisma.user.delete({ where: { id } });
  await logActivity({ action: "USER_DELETED", description: `Deleted user "${user.username}"` });

  revalidatePath("/dashboard/users");
  return { ok: true };
}
