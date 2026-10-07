import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";
export const FISCAL_PREVIEW_TTL_SECONDS = 5 * 60;

type PreviewClaims = {
  hash: string;
  subject: string;
  expiresAt: number;
};

function sign(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret)
    .update(`${TOKEN_VERSION}.${payload}`)
    .digest();
}

export function issueFiscalPreviewEvidence(
  hash: string,
  subject: string,
  secret: string,
  now = Date.now(),
): string {
  if (secret.length < 32) throw new Error("Segredo de prévia inválido.");
  if (!/^[0-9a-f]{64}$/.test(hash) || !subject)
    throw new Error("Dados da prévia inválidos.");

  const claims: PreviewClaims = {
    hash,
    subject,
    expiresAt: Math.floor(now / 1000) + FISCAL_PREVIEW_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${TOKEN_VERSION}.${payload}.${sign(payload, secret).toString("base64url")}`;
}

export function verifyFiscalPreviewEvidence(
  token: string,
  hash: string,
  subject: string,
  secret: string,
  now = Date.now(),
): boolean {
  if (
    secret.length < 32 ||
    !/^[0-9a-f]{64}$/.test(hash) ||
    !subject ||
    token.length > 2048
  )
    return false;

  const [version, payload, suppliedSignature, ...extra] = token.split(".");
  if (
    version !== TOKEN_VERSION ||
    !payload ||
    !suppliedSignature ||
    extra.length > 0 ||
    !/^[A-Za-z0-9_-]+$/.test(payload) ||
    !/^[A-Za-z0-9_-]+$/.test(suppliedSignature)
  )
    return false;

  const expectedSignature = sign(payload, secret);
  const actualSignature = Buffer.from(suppliedSignature, "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  )
    return false;

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  if (typeof claims !== "object" || claims === null) return false;
  const parsed = claims as Partial<PreviewClaims>;
  return (
    parsed.hash === hash &&
    parsed.subject === subject &&
    typeof parsed.expiresAt === "number" &&
    Number.isInteger(parsed.expiresAt) &&
    parsed.expiresAt > Math.floor(now / 1000)
  );
}
