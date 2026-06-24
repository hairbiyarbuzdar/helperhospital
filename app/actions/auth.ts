"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { LoginFormSchema, type LoginFormState } from "@/lib/definitions";
import { createSession, deleteSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function login(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const validated = LoginFormSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { username, password } = validated.data;

  const user = await prisma.user.findUnique({ where: { username } });

  // Same generic message whether the user is missing, inactive, or the
  // password is wrong — don't leak which usernames exist.
  if (!user || !user.isActive) {
    return { message: "Invalid username or password." };
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return { message: "Invalid username or password." };
  }

  await createSession(user.id, user.role);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
