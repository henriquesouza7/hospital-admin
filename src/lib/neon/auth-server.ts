import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";
import { getNeonServerEnv } from "@/lib/neon/env";

type NeonAuth = ReturnType<typeof createNeonAuth>;

let authClient: NeonAuth | undefined;

export function getNeonAuth() {
  if (authClient) {
    return authClient;
  }

  const env = getNeonServerEnv();
  authClient = createNeonAuth({
    baseUrl: env.authBaseUrl,
    cookies: {
      secret: env.authCookieSecret,
      sessionDataTtl: 300,
    },
  });

  return authClient;
}
