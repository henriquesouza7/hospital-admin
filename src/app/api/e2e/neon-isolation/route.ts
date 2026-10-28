import { getNeonServerEnv } from "@/lib/neon/env";
import { isAuthorizedIsolatedE2eEnvironment } from "@/lib/neon/isolated-e2e-environment";

export function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  try {
    const environment = getNeonServerEnv();
    const authorized = isAuthorizedIsolatedE2eEnvironment({
      appOrigin: new URL(request.url).origin,
      authBaseUrl: environment.authBaseUrl,
      dataApiUrl: environment.dataApiUrl,
      label: process.env.NEXT_PUBLIC_HOSPITAL_ENVIRONMENT,
    });

    return new Response(null, {
      status: authorized ? 204 : 404,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
