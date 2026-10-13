import { z } from "zod";

const serverEnvSchema = z
  .object({
    authBaseUrl: z.string().url(),
    authCookieSecret: z.string().min(32),
    dataApiUrl: z.string().url(),
  })
  .superRefine((environment, context) => {
    const auth = new URL(environment.authBaseUrl);
    const dataApi = new URL(environment.dataApiUrl);
    const authDatabase = auth.pathname.split("/").filter(Boolean)[0];
    const dataDatabase = dataApi.pathname.split("/").filter(Boolean)[0];
    const authEndpoint = auth.hostname.replace(".neonauth.", ".");
    const dataEndpoint = dataApi.hostname.replace(".apirest.", ".");
    const isNeonServiceHost = (
      hostname: string,
      service: "neonauth" | "apirest",
    ) =>
      new RegExp(
        `^ep-[a-z0-9-]+\\.${service}\\.c-\\d+(?:\\.[a-z]{2,3}(?:-[a-z]+)+-\\d+)?\\.aws\\.neon\\.tech$`,
      ).test(hostname);

    if (
      auth.protocol !== "https:" ||
      dataApi.protocol !== "https:" ||
      auth.username !== "" ||
      auth.password !== "" ||
      dataApi.username !== "" ||
      dataApi.password !== "" ||
      auth.search !== "" ||
      auth.hash !== "" ||
      dataApi.search !== "" ||
      dataApi.hash !== "" ||
      !isNeonServiceHost(auth.hostname, "neonauth") ||
      !isNeonServiceHost(dataApi.hostname, "apirest") ||
      authEndpoint !== dataEndpoint ||
      auth.port !== dataApi.port ||
      !authDatabase ||
      authDatabase !== dataDatabase ||
      auth.pathname !== `/${authDatabase}/auth` ||
      dataApi.pathname !== `/${dataDatabase}/rest/v1`
    ) {
      context.addIssue({
        code: "custom",
        message:
          "NEON_AUTH_BASE_URL e NEON_DATA_API_URL devem apontar ao mesmo endpoint Neon, banco e ambiente.",
      });
    }
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

export function getNeonServerEnv(
  environment: Environment = processEnvironment,
): NeonServerEnv {
  const result = serverEnvSchema.safeParse({
    authBaseUrl: environment.NEON_AUTH_BASE_URL,
    authCookieSecret: environment.NEON_AUTH_COOKIE_SECRET,
    dataApiUrl: environment.NEON_DATA_API_URL,
  });

  if (!result.success) {
    const safeCustomIssue = result.error.issues.find(
      (issue) => issue.code === "custom",
    );
    throw new Error(
      safeCustomIssue?.message ??
        "Neon server não configurado. Defina NEON_AUTH_BASE_URL, NEON_DATA_API_URL e um NEON_AUTH_COOKIE_SECRET com pelo menos 32 caracteres.",
    );
  }

  return result.data;
}
