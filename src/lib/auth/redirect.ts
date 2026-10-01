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
