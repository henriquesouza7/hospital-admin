import { z } from "zod";

const publicEnvSchema = z.object({
  authUrl: z.string().url(),
  dataApiUrl: z.string().url(),
});

const serverEnvSchema = publicEnvSchema.extend({
  authBaseUrl: z.string().url(),
  authCookieSecret: z.string().min(32),
});

export type NeonPublicEnv = z.infer<typeof publicEnvSchema>;
export type NeonServerEnv = z.infer<typeof serverEnvSchema>;

type Environment = Readonly<{
  NEON_AUTH_BASE_URL?: string;
  NEON_AUTH_COOKIE_SECRET?: string;
  NEXT_PUBLIC_NEON_AUTH_URL?: string;
  NEXT_PUBLIC_NEON_DATA_API_URL?: string;
}>;

const processEnvironment: Environment = {
  NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
  NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET,
  NEXT_PUBLIC_NEON_AUTH_URL: process.env.NEXT_PUBLIC_NEON_AUTH_URL,
  NEXT_PUBLIC_NEON_DATA_API_URL: process.env.NEXT_PUBLIC_NEON_DATA_API_URL,
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

export function getNeonPublicEnv(
  environment: Environment = processEnvironment,
): NeonPublicEnv {
  return parseOrThrow(
    publicEnvSchema.safeParse({
      authUrl: environment.NEXT_PUBLIC_NEON_AUTH_URL,
      dataApiUrl: environment.NEXT_PUBLIC_NEON_DATA_API_URL,
    }),
    "Neon não configurado. Defina NEXT_PUBLIC_NEON_AUTH_URL e NEXT_PUBLIC_NEON_DATA_API_URL.",
  );
}

export function getNeonServerEnv(
  environment: Environment = processEnvironment,
): NeonServerEnv {
  return parseOrThrow(
    serverEnvSchema.safeParse({
      authUrl: environment.NEXT_PUBLIC_NEON_AUTH_URL,
      dataApiUrl: environment.NEXT_PUBLIC_NEON_DATA_API_URL,
      authBaseUrl: environment.NEON_AUTH_BASE_URL,
      authCookieSecret: environment.NEON_AUTH_COOKIE_SECRET,
    }),
    "Neon server não configurado. Defina os endpoints públicos, NEON_AUTH_BASE_URL e um NEON_AUTH_COOKIE_SECRET com pelo menos 32 caracteres.",
  );
}
