"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSafeRedirectPath, loginPath } from "@/lib/auth/redirect";
import { getNeonAuth } from "@/lib/neon/auth-server";

export type LoginState = Readonly<{ error?: string }>;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export async function signInWithPassword(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Informe um email válido e sua senha." };
  }

  try {
    const { error } = await getNeonAuth().signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return { error: "Email ou senha inválidos." };
    }
  } catch {
    return { error: "O login está indisponível no momento." };
  }

  redirect(getSafeRedirectPath(parsed.data.next));
}

export async function signOut() {
  try {
    await getNeonAuth().signOut();
  } finally {
    redirect(loginPath);
  }
}
