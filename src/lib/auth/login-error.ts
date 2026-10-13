type ErrorPayload = Readonly<Record<string, unknown>>;

const errorMessages = {
  invalidCredentials: "Email ou senha inválidos.",
  invalidEmail: "Informe um endereço de email válido.",
  rateLimited:
    "Muitas tentativas de acesso. Aguarde antes de tentar novamente.",
  unavailable:
    "O login está indisponível no momento. Tente novamente mais tarde.",
  configuration: "O login não está configurado. Procure o administrador.",
  unverified: "Não foi possível autenticar a conta. Procure o administrador.",
  unexpected:
    "Não foi possível processar o login. Confira os dados ou procure o administrador.",
} as const;

function getProviderCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;

  const record = payload as ErrorPayload;
  if (typeof record.code === "string") return record.code;

  if (typeof record.error === "object" && record.error !== null) {
    const nestedCode = (record.error as ErrorPayload).code;
    if (typeof nestedCode === "string") return nestedCode;
  }

  return undefined;
}

export function getLoginErrorMessage(status: number, payload: unknown): string {
  const code = getProviderCode(payload);

  if (status === 429) return errorMessages.rateLimited;
  if (status >= 500) return errorMessages.unavailable;
  if (status === 401 && code === "INVALID_EMAIL_OR_PASSWORD") {
    return errorMessages.invalidCredentials;
  }
  if (status === 400 && code === "INVALID_EMAIL") {
    return errorMessages.invalidEmail;
  }
  if (status === 400 && code === "EMAIL_PASSWORD_DISABLED") {
    return errorMessages.configuration;
  }
  if (status === 403 && code === "EMAIL_NOT_VERIFIED") {
    return errorMessages.unverified;
  }

  return errorMessages.unexpected;
}

export function getLoginUnavailableMessage(): string {
  return errorMessages.unavailable;
}
