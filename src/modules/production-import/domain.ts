import { z } from "zod";

export const MAX_SUS_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_SUS_CSV_ROWS = 500;
export const MAX_SUS_CSV_COLUMNS = 40;

export const productionCsvColumnsSchema = z.object({
  procedure: z.number().int().min(0),
  quantity: z.number().int().min(0),
  sourceType: z.number().int().min(0),
  code: z.number().int().min(0).optional(),
});

export type ProductionCsvColumns = z.infer<typeof productionCsvColumnsSchema>;

export type SusCsvDocument = Readonly<{
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}>;

export type ProductionImportGroup = Readonly<{
  key: string;
  mappingKey: string;
  externalCode: string | null;
  procedureName: string;
  sourceType: "apresentado" | "aprovado" | "realizado";
  rowCount: number;
  quantity: string;
}>;

export type ProductionImportRow = Readonly<{
  row_number: number;
  external_code: string | null;
  procedure_name: string;
  source_type: "apresentado" | "aprovado" | "realizado";
  quantity: string;
  procedure_id: string;
}>;

const patientIdentifierHeaderPatterns = [
  /(?:^|\s)(?:paciente|patient)(?:\s|$)/,
  /^nome(?: completo| social)?$/,
  /(?:^|\s)nome(?: completo| social)?\s+(?:(?:do|da|de)\s+)?(?:paciente|patient)(?:\s|$)/,
  /(?:^|\s)nome\s+(?:(?:da|de)\s+)?(?:mae|mother)(?:\s|$)/,
  /(?:^|\s)nome\s+(?:(?:do|da|de)\s+)?(?:pai|father)(?:\s|$)/,
  /(?:^|\s)(?:father|mother|parent)\s+name(?:\s|$)/,
  /(?:^|\s)full\s+name(?:\s|$)/,
  /(?:^|\s)(?:cpf|cns|ssn)(?:\s|$)/,
  /(?:^|\s)(?:c\s+p\s+f|c\s+n\s+s|r\s+g)(?:\s|$)/,
  /(?:^|\s)(?:e mail|email|correio eletronico)(?:\s|$)/,
  /(?:^|\s)(?:rg|registro geral|carteira de identidade)(?:\s|$)/,
  /(?:^|\s)(?:cartao sus|cartao nacional de saude)(?:\s|$)/,
  /(?:^|\s)(?:prontuario|medical record)(?:\s|$)/,
  /(?:^|\s)(?:nascimento|nasc|birth date|birthdate|date of birth|dob)(?:\s|$)/,
  /(?:^|\s)(?:dt|data)(?:\s+de)?\s+nasc(?:imento)?(?:\s|$)/,
  /(?:^|\s)(?:telefone|celular|fone|phone|whatsapp|wpp)(?:\s|$)/,
  /(?:^|\s)(?:endereco|address)(?:\s|$)/,
];
const aggregatePatientCountHeaderPatterns = [
  /^(?:quantidade|qtd|total|numero|count|number)(?:\s+(?:de|of))?\s+(?:paciente|patient)s?$/,
  /^(?:paciente|patient)\s+count$/,
];

function normalizeHeader(header: string): string {
  return header
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

export function containsPatientColumns(headers: readonly string[]): boolean {
  return headers.some((header) => {
    const normalized = normalizeHeader(header);
    if (
      aggregatePatientCountHeaderPatterns.some((pattern) =>
        pattern.test(normalized),
      )
    ) {
      return false;
    }
    return patientIdentifierHeaderPatterns.some((pattern) =>
      pattern.test(normalized),
    );
  });
}

export function parseSusCsv(
  content: string,
  delimiter: "," | ";",
): SusCsvDocument {
  const text = content.replace(/^\uFEFF/, "");
  if (!text.trim()) throw new Error("O arquivo CSV está vazio.");
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (closedQuote) {
      if (character === delimiter) {
        record.push(field);
        field = "";
        closedQuote = false;
      } else if (character === "\r" || character === "\n") {
        record.push(field);
        records.push(record);
        record = [];
        field = "";
        closedQuote = false;
        if (character === "\r" && text[index + 1] === "\n") index += 1;
      } else {
        throw new Error("O CSV contém aspas ou delimitadores fora do formato.");
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new Error("O CSV contém aspas ou delimitadores fora do formato.");
      }
      quoted = true;
    } else if (character === delimiter) {
      record.push(field);
      field = "";
    } else if (character === "\r" || character === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("O CSV contém uma aspa não fechada.");
  if (field.length > 0 || record.length > 0 || closedQuote) {
    record.push(field);
    records.push(record);
  }

  while (
    records.length > 0 &&
    records[records.length - 1].every((cell) => !cell.trim())
  )
    records.pop();
  const [rawHeaders, ...rows] = records;
  if (
    !rawHeaders ||
    rawHeaders.length < 2 ||
    rawHeaders.length > MAX_SUS_CSV_COLUMNS
  ) {
    throw new Error("O cabeçalho deve conter de 2 a 40 colunas.");
  }
  if (rows.length < 1 || rows.length > MAX_SUS_CSV_ROWS) {
    throw new Error("O CSV deve conter de 1 a 500 linhas de dados.");
  }
  const headers = rawHeaders.map((header) => header.trim());
  if (headers.some((header) => !header)) {
    throw new Error("Todas as colunas do cabeçalho precisam ter um nome.");
  }
  const normalizedHeaders = headers.map(normalizeHeader);
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    throw new Error("O CSV contém nomes de colunas duplicados.");
  }
  if (containsPatientColumns(headers)) {
    throw new Error(
      "O arquivo contém colunas de identificação de pacientes. Remova-as antes de importar.",
    );
  }
  if (rows.some((row) => row.length !== headers.length)) {
    throw new Error(
      "Todas as linhas devem ter a mesma quantidade de colunas do cabeçalho.",
    );
  }

  return { headers, rows };
}

function parseSourceType(value: string): ProductionImportGroup["sourceType"] {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  if (
    normalized !== "apresentado" &&
    normalized !== "aprovado" &&
    normalized !== "realizado"
  ) {
    throw new Error(
      "Use somente as classificações apresentado, aprovado ou realizado.",
    );
  }
  return normalized;
}

function mappingKey(
  externalCode: string | null,
  procedureName: string,
): string {
  return JSON.stringify([
    externalCode,
    procedureName.trim().toLocaleLowerCase("pt-BR"),
  ]);
}

function groupKey(
  externalCode: string | null,
  procedureName: string,
  sourceType: string,
): string {
  return JSON.stringify([
    externalCode,
    procedureName.trim().toLocaleLowerCase("pt-BR"),
    sourceType,
  ]);
}

export function summarizeSusRows(
  document: SusCsvDocument,
  columns: ProductionCsvColumns,
): ProductionImportGroup[] {
  const parsedColumns = productionCsvColumnsSchema.safeParse(columns);
  if (!parsedColumns.success)
    throw new Error("Selecione colunas válidas para o mapeamento.");
  const selected = [columns.procedure, columns.quantity, columns.sourceType];
  if (columns.code !== undefined) selected.push(columns.code);
  if (
    new Set(selected).size !== selected.length ||
    selected.some((column) => column >= document.headers.length)
  ) {
    throw new Error("Cada campo deve usar uma coluna diferente do arquivo.");
  }

  const groups = new Map<string, ProductionImportGroup>();
  document.rows.forEach((row, index) => {
    const procedureName = row[columns.procedure].trim();
    const quantityText = row[columns.quantity].trim();
    const sourceType = parseSourceType(row[columns.sourceType]);
    const externalCode =
      columns.code === undefined ? null : row[columns.code].trim() || null;
    if (!procedureName || procedureName.length > 240) {
      throw new Error(`Revise o nome do procedimento na linha ${index + 2}.`);
    }
    if (externalCode && externalCode.length > 100) {
      throw new Error(`Revise o código do procedimento na linha ${index + 2}.`);
    }
    if (
      !/^[0-9]{1,10}$/.test(quantityText) ||
      Number(quantityText) >= 10_000_000_000
    ) {
      throw new Error(
        `A quantidade na linha ${index + 2} deve ser um inteiro entre zero e 9.999.999.999.`,
      );
    }
    const key = groupKey(externalCode, procedureName, sourceType);
    const previous = groups.get(key);
    const previousQuantity = Number(previous?.quantity ?? "0");
    const nextQuantity = previousQuantity + Number(quantityText);
    if (nextQuantity >= 10_000_000_000) {
      throw new Error(
        `A soma da quantidade importada para o procedimento excede o limite permitido.`,
      );
    }
    groups.set(key, {
      key,
      mappingKey: mappingKey(externalCode, procedureName),
      externalCode,
      procedureName,
      sourceType,
      rowCount: (previous?.rowCount ?? 0) + 1,
      quantity: String(nextQuantity),
    });
  });

  return [...groups.values()].sort((left, right) =>
    left.procedureName.localeCompare(right.procedureName, "pt-BR"),
  );
}

export function mapSusRowsToProcedures(
  document: SusCsvDocument,
  columns: ProductionCsvColumns,
  mappings: Readonly<Record<string, string>>,
): ProductionImportRow[] {
  const groups = summarizeSusRows(document, columns);
  if (groups.some((group) => !mappings[group.mappingKey])) {
    throw new Error(
      "Associe cada procedimento do arquivo a um cadastro existente.",
    );
  }
  const allowedKeys = new Set(groups.map((group) => group.mappingKey));
  if (Object.keys(mappings).some((key) => !allowedKeys.has(key))) {
    throw new Error(
      "O mapeamento enviado não corresponde à prévia do arquivo.",
    );
  }
  return document.rows.map((row, index) => {
    const procedureName = row[columns.procedure].trim();
    const externalCode =
      columns.code === undefined ? null : row[columns.code].trim() || null;
    const key = mappingKey(externalCode, procedureName);
    const sourceType = parseSourceType(row[columns.sourceType]);
    const quantity = row[columns.quantity].trim();
    if (Number(quantity) >= 10_000_000_000) {
      throw new Error(
        `A quantidade na linha ${index + 2} excede o limite permitido.`,
      );
    }
    return {
      row_number: index + 2,
      external_code: externalCode,
      procedure_name: procedureName,
      source_type: sourceType,
      quantity,
      procedure_id: mappings[key],
    };
  });
}
