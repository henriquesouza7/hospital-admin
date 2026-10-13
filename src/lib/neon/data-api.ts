import "server-only";

import { createClient } from "@neondatabase/neon-js";
import { cache } from "react";
import { logDashboardQueryFailure } from "./dashboard-diagnostics";
import { getNeonAuth } from "@/lib/neon/auth-server";
import { getNeonServerEnv } from "@/lib/neon/env";

type NeonDataApiClient = ReturnType<typeof createClient>;

let neonDataApiClient: NeonDataApiClient | undefined;

// Share token refreshes within one render without reusing tokens across requests.
const getDataApiToken = cache(async () => {
  const startedAt = performance.now();
  const result = await getNeonAuth()
    .token()
    .catch((error: unknown) => {
      logDashboardQueryFailure({
        operation: "data_api_auth_token",
        stage: "auth_api",
        error,
        durationMs: performance.now() - startedAt,
      });
      throw error;
    });
  const { data, error } = result;
  if (error || !data?.token) {
    logDashboardQueryFailure({
      operation: "data_api_auth_token",
      stage: "auth_api",
      error,
      durationMs: performance.now() - startedAt,
    });
  }
  return data?.token ?? null;
});

export function getNeonDataApiClient() {
  if (neonDataApiClient) {
    return neonDataApiClient;
  }

  const env = getNeonServerEnv();
  neonDataApiClient = createClient({
    dataApi: {
      url: env.dataApiUrl,
      getToken: getDataApiToken,
    },
  });

  return neonDataApiClient;
}
