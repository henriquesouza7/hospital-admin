import "server-only";

import { createClient } from "@neondatabase/neon-js";
import { cache } from "react";
import { hasAdminRole } from "@/lib/auth/roles";
import { logDashboardQueryFailure } from "./dashboard-diagnostics";
import { getNeonAuth } from "@/lib/neon/auth-server";
import { getNeonServerEnv } from "@/lib/neon/env";
import { createResilientReadFetch } from "./read-resilience";

type NeonDataApiClient = ReturnType<typeof createClient>;

async function loadDataApiToken() {
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
  if (error || !data?.token)
    throw new Error("Data API authentication required");
  return data.token;
}

const getDataApiToken = cache(loadDataApiToken);

export function getNeonDataApiClient(): NeonDataApiClient {
  const env = getNeonServerEnv();
  return createClient({
    dataApi: {
      url: env.dataApiUrl,
      getToken: getDataApiToken,
      options: {
        global: {
          fetch: createResilientReadFetch({
            baseUrl: env.dataApiUrl,
            fetch: (input, init) => fetch(input, init),
            refreshToken: loadDataApiToken,
            getIdentity: async () => {
              const { data, error } = await getNeonAuth().getSession();
              if (error || !data?.user?.id) return null;
              return { subject: data.user.id, admin: hasAdminRole(data.user) };
            },
            report: (event) =>
              console.warn("data_api_read_recovery", JSON.stringify(event)),
          }),
        },
      },
    },
  });
}
