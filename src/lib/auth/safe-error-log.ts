const safeErrorCode = /^[A-Za-z0-9_-]{1,64}$/;

export function getSafeAuthErrorDetails(
  operation: "request_password_reset" | "reset_password",
  error: unknown,
) {
  if (typeof error !== "object" || error === null) {
    return { operation };
  }

  const candidate = error as { status?: unknown; code?: unknown };
  return {
    operation,
    ...(typeof candidate.status === "number" &&
    Number.isInteger(candidate.status) &&
    candidate.status >= 100 &&
    candidate.status <= 599
      ? { status: candidate.status }
      : {}),
    ...(typeof candidate.code === "string" && safeErrorCode.test(candidate.code)
      ? { code: candidate.code }
      : {}),
  };
}
