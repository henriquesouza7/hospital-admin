import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isPublicPath } from "@/lib/auth/redirect";
import { getNeonAuth } from "@/lib/neon/auth-server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  try {
    return await getNeonAuth().middleware({ loginUrl: "/login" })(request);
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "configuration");
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
