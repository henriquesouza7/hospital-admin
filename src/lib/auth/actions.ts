"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPasswordResetRedirectUrl, loginPath } from "@/lib/auth/redirect";
import { getSafeAuthErrorDetails } from "@/lib/auth/safe-error-log";
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
  const { error } = await getNeonAuth().signOut();

  if (error) {
    throw new Error("Não foi possível encerrar a sessão.");
  }

  redirect(loginPath);
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
      console.warn(
        "auth.reset_password_failed",
        getSafeAuthErrorDetails("reset_password", error),
      );
      return { error: "O link de recuperação é inválido ou expirou." };
    }
  } catch (error) {
    console.warn(
      "auth.reset_password_failed",
      getSafeAuthErrorDetails("reset_password", error),
    );
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
    const { error } = await getNeonAuth().requestPasswordReset({
      email: parsed.data.email,
      redirectTo: getPasswordResetRedirectUrl(
        process.env.APP_BASE_URL,
        process.env.NODE_ENV,
      ),
    });

    if (error) {
      console.warn(
        "auth.request_password_reset_failed",
        getSafeAuthErrorDetails("request_password_reset", error),
      );
      return { error: "Não foi possível solicitar a recuperação agora." };
    }
  } catch (error) {
    console.warn(
      "auth.request_password_reset_failed",
      getSafeAuthErrorDetails("request_password_reset", error),
    );
    return { error: "Não foi possível solicitar a recuperação agora." };
  }

  return { success: true };
}
