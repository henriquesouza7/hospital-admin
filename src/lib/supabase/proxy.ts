import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLoginRedirectUrl, isPublicPath } from "@/lib/auth/redirect";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

function copySupabaseResponseMetadata(
  source: NextResponse,
  target: NextResponse,
) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  for (const headerName of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(headerName);
    if (value) {
      target.headers.set(headerName, value);
    }
  }

  return target;
}

export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  let env: ReturnType<typeof getSupabaseEnv>;
  try {
    env = getSupabaseEnv();
  } catch {
    if (isPublicPath(pathname)) {
      return supabaseResponse;
    }

    return copySupabaseResponseMetadata(
      supabaseResponse,
      NextResponse.redirect(
        getLoginRedirectUrl(request.nextUrl.origin, pathname, "configuration"),
      ),
    );
  }

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request: { headers: new Headers(request.headers) },
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  const hasClaims = Boolean(claimsData?.claims);

  if (!hasClaims && !isPublicPath(pathname)) {
    return copySupabaseResponseMetadata(
      supabaseResponse,
      NextResponse.redirect(
        getLoginRedirectUrl(request.nextUrl.origin, pathname, "session"),
      ),
    );
  }

  if (hasClaims && pathname === "/login") {
    return copySupabaseResponseMetadata(
      supabaseResponse,
      NextResponse.redirect(new URL("/", request.url)),
    );
  }

  return supabaseResponse;
}
