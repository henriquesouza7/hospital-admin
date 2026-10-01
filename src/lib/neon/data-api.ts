import "server-only";

import { createClient } from "@neondatabase/neon-js";
import { getNeonAuth } from "@/lib/neon/auth-server";
import { getNeonServerEnv } from "@/lib/neon/env";

type NeonDataApiClient = ReturnType<typeof createClient>;

let neonDataApiClient: NeonDataApiClient | undefined;

export function getNeonDataApiClient() {
  if (neonDataApiClient) {
    return neonDataApiClient;
  }

  const env = getNeonServerEnv();
  neonDataApiClient = createClient({
    dataApi: {
      url: env.dataApiUrl,
      getToken: async () => {
        const { data } = await getNeonAuth().token();
        return data?.token ?? null;
      },
    },
  });

  return neonDataApiClient;
}
