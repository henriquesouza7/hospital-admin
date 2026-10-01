import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLoginRedirectUrl, isPublicPath } from "@/lib/auth/redirect";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach(({ name, value }) => {
    target.cookies.set(name, value);
  });

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

    return NextResponse.redirect(
      getLoginRedirectUrl(request.nextUrl.origin, pathname, "configuration"),
    );
  }

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(
        getLoginRedirectUrl(request.nextUrl.origin, pathname, "session"),
      ),
    );
  }

  if (user && pathname === "/login") {
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(new URL("/", request.url)),
    );
  }

  return supabaseResponse;
}
