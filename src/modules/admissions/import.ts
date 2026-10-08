import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { entryDateSchema, entryCreateSchema } from "./validation";

export const MAX_ADMISSION_CSV_BYTES = 1_000_000;
export const MAX_ADMISSION_CSV_ROWS = 1000;

export type AdmissionImportRow = Readonly<{
  line: number;
  entry_date: string;
  doctor_name: string;
  quantity: number;
  doctor_id: string | null;
  error: string | null;
}>;

export type CsvDoctor = Readonly<{ id: string; name: string; active: boolean }>;

function parseCsvRecords(input: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"' && field.length === 0) quoted = true;
    else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      record.push(field);
      if (record.some((value) => value.trim() !== "")) records.push(record);
      record = [];
      field = "";
    } else field += character;
  }
  if (quoted)
    throw new Error("O CSV contém uma célula sem aspas de fechamento.");
  record.push(field);
  if (record.some((value) => value.trim() !== "")) records.push(record);
  return records;
}

function normalizedName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function hashAdmissionCsv(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseAdmissionCsv(
  input: string,
  doctors: readonly CsvDoctor[],
): AdmissionImportRow[] {
  const records = parseCsvRecords(input.replace(/^\uFEFF/, ""));
  if (records.length < 2)
    throw new Error("O CSV deve conter cabeçalho e pelo menos uma linha.");
  if (records.length - 1 > MAX_ADMISSION_CSV_ROWS)
    throw new Error("O CSV excede 1.000 linhas.");
  const header = records[0].map((value) =>
    value.trim().toLocaleLowerCase("pt-BR"),
  );
  if (
    header.length !== 3 ||
    header[0] !== "data" ||
    header[1] !== "medico" ||
    header[2] !== "quantidade"
  ) {
    throw new Error("Use as colunas nesta ordem: data,medico,quantidade.");
  }
  const doctorsByName = new Map<string, CsvDoctor[]>();
  for (const doctor of doctors) {
    const key = normalizedName(doctor.name);
    doctorsByName.set(key, [...(doctorsByName.get(key) ?? []), doctor]);
  }
  const seen = new Set<string>();
  return records.slice(1).map((columns, index) => {
    const [entryDate = "", doctorName = "", rawQuantity = ""] = columns;
    const line = index + 2;
    let error: string | null = null;
    let quantity = 0;
    if (columns.length !== 3)
      error = "A linha deve conter exatamente três colunas.";
    else if (!entryDateSchema.safeParse(entryDate.trim()).success)
      error = "Data inválida; use AAAA-MM-DD.";
    else {
      const validated = entryCreateSchema.shape.quantity.safeParse(
        rawQuantity.trim(),
      );
      if (!validated.success)
        error = "Quantidade deve ser um inteiro não negativo.";
      else quantity = validated.data;
    }
    const matches = doctorsByName.get(normalizedName(doctorName)) ?? [];
    const doctor = matches.length === 1 ? matches[0] : undefined;
    if (!error && matches.length === 0)
      error = "Médico não encontrado pelo nome exato.";
    else if (!error && matches.length > 1)
      error =
        "Nome do médico ambíguo; informe um nome cadastrado sem duplicidade.";
    else if (!error && doctor && !doctor.active)
      error = "Médico inativo não pode receber novos lançamentos.";
    if (!error && doctor) {
      const key = `${doctor.id}:${entryDate.trim()}`;
      if (seen.has(key))
        error = "Lançamento duplicado no arquivo para médico e data.";
      else seen.add(key);
    }
    return {
      line,
      entry_date: entryDate.trim(),
      doctor_name: doctorName.trim(),
      quantity,
      doctor_id: doctor?.id ?? null,
      error,
    };
  });
}

type AdmissionPreviewClaims = Readonly<{
  hash: string;
  subject: string;
  expiresAt: number;
}>;
const tokenVersion = "admissions-v1";
const tokenTtlSeconds = 5 * 60;

export function issueAdmissionCsvEvidence(
  hash: string,
  subject: string,
  secret: string,
  now = Date.now(),
): string {
  if (secret.length < 32 || !/^[0-9a-f]{64}$/.test(hash) || !subject)
    throw new Error("Dados da prévia inválidos.");
  const claims: AdmissionPreviewClaims = {
    hash,
    subject,
    expiresAt: Math.floor(now / 1000) + tokenTtlSeconds,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${tokenVersion}.${payload}`)
    .digest("base64url");
  return `${tokenVersion}.${payload}.${signature}`;
}

export function verifyAdmissionCsvEvidence(
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
  const [version, payload, signature, ...extra] = token.split(".");
  if (version !== tokenVersion || !payload || !signature || extra.length > 0)
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${tokenVersion}.${payload}`)
    .digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return false;
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<AdmissionPreviewClaims>;
    return (
      claims.hash === hash &&
      claims.subject === subject &&
      typeof claims.expiresAt === "number" &&
      claims.expiresAt > Math.floor(now / 1000)
    );
  } catch {
    return false;
  }
}
