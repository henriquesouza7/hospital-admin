export const loginPath = "/login";

export function isPublicPath(pathname: string) {
  return pathname === loginPath || pathname.startsWith(`${loginPath}/`);
}

export function getSafeRedirectPath(value: unknown) {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/";
}

export function getLoginRedirectUrl(
  origin: string,
  pathname: string,
  reason?: "configuration" | "session",
) {
  const url = new URL(loginPath, origin);

  if (pathname !== loginPath) {
    url.searchParams.set("next", pathname);
  }

  if (reason) {
    url.searchParams.set("error", reason);
  }

  return url;
}
