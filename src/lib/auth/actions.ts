"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginPath } from "@/lib/auth/redirect";
import { getNeonAuth } from "@/lib/neon/auth-server";

export type PasswordResetState = Readonly<{
  error?: string;
  success?: boolean;
}>;

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
  token: z.string().min(1),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export async function signOut() {
  try {
    await getNeonAuth().signOut();
  } finally {
    redirect(loginPath);
  }
}

export async function resetPassword(
  _previousState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = resetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }

  try {
    const { error } = await getNeonAuth().resetPassword({
      newPassword: parsed.data.newPassword,
      token: parsed.data.token,
    });

    if (error) {
      return { error: "O link de recuperação é inválido ou expirou." };
    }
  } catch {
    return { error: "O link de recuperação é inválido ou expirou." };
  }

  redirect(loginPath);
}

export async function requestPasswordReset(
  _previousState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "Informe um email válido." };
  }

  try {
    const requestHeaders = await headers();
    const referer = requestHeaders.get("referer");
    const origin =
      requestHeaders.get("origin") ??
      (referer ? new URL(referer).origin : "http://localhost:3000");

    const { error } = await getNeonAuth().requestPasswordReset({
      email: parsed.data.email,
      redirectTo: `${origin}/login/reset-password`,
    });

    if (error) {
      return { error: "Não foi possível solicitar a recuperação agora." };
    }
  } catch {
    return { error: "Não foi possível solicitar a recuperação agora." };
  }

  return { success: true };
}
