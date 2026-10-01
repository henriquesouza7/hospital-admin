"use client";

import { createClient } from "@neondatabase/neon-js";
import { getNeonPublicEnv } from "@/lib/neon/env";

type NeonClient = ReturnType<typeof createClient>;

let neonClient: NeonClient | undefined;

export function getNeonClient() {
  if (neonClient) {
    return neonClient;
  }

  const env = getNeonPublicEnv();
  neonClient = createClient({
    auth: { url: env.authUrl },
    dataApi: { url: env.dataApiUrl },
  });

  return neonClient;
}
