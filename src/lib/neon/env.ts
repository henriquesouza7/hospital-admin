import { z } from "zod";

const serverEnvSchema = z.object({
  authBaseUrl: z.string().url(),
  authCookieSecret: z.string().min(32),
  dataApiUrl: z.string().url(),
});

export type NeonServerEnv = z.infer<typeof serverEnvSchema>;

type Environment = Readonly<{
  NEON_AUTH_BASE_URL?: string;
  NEON_AUTH_COOKIE_SECRET?: string;
  NEON_DATA_API_URL?: string;
}>;

const processEnvironment: Environment = {
  NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
  NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET,
  NEON_DATA_API_URL: process.env.NEON_DATA_API_URL,
};

function parseOrThrow<T>(
  result: { success: true; data: T } | { success: false },
  message: string,
) {
  if (!result.success) {
    throw new Error(message);
  }

  return result.data;
}

export function getNeonServerEnv(
  environment: Environment = processEnvironment,
): NeonServerEnv {
  return parseOrThrow(
    serverEnvSchema.safeParse({
      authBaseUrl: environment.NEON_AUTH_BASE_URL,
      authCookieSecret: environment.NEON_AUTH_COOKIE_SECRET,
      dataApiUrl: environment.NEON_DATA_API_URL,
    }),
    "Neon server não configurado. Defina NEON_AUTH_BASE_URL, NEON_DATA_API_URL e um NEON_AUTH_COOKIE_SECRET com pelo menos 32 caracteres.",
  );
}
