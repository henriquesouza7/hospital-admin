export const loginPath = "/login";
const localAppOrigin = "http://localhost:3000";

export function isPublicPath(pathname: string) {
  return pathname === loginPath || pathname.startsWith(`${loginPath}/`);
}

export function getSafeRedirectPath(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }

  try {
    return new URL(value, localAppOrigin).origin === localAppOrigin
      ? value
      : "/";
  } catch {
    return "/";
  }
}

export function getPasswordResetRedirectUrl(
  appBaseUrl: string | undefined,
  nodeEnv: string | undefined,
) {
  const origin =
    appBaseUrl ?? (nodeEnv === "development" ? localAppOrigin : undefined);

  if (!origin) {
    throw new Error("APP_BASE_URL é obrigatório fora do desenvolvimento.");
  }

  const url = new URL(origin);

  if (
    url.origin !== origin ||
    (url.protocol !== "https:" &&
      !(nodeEnv === "development" && url.origin === localAppOrigin))
  ) {
    throw new Error("APP_BASE_URL deve ser uma origem HTTPS válida.");
  }

  return `${url.origin}/login/reset-password`;
}
