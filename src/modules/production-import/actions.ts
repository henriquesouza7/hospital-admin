"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getNeonServerEnv } from "@/lib/neon/env";
import { requireProductionAdmin } from "@/modules/production/access";
import {
  issueFiscalPreviewEvidence,
  verifyFiscalPreviewEvidence,
} from "@/modules/finance/fiscal-import/preview-evidence";
import {
  MAX_SUS_CSV_BYTES,
  mapSusRowsToProcedures,
  parseSusCsv,
  summarizeSusRows,
} from "./domain";
import type { ProductionImportActionState } from "./action-state";
import { hashProductionPreviewContext } from "./preview-context";
import {
  parseProductionImportPeriod,
  productionCsvRequestSchema,
  productionImportConfirmationSchema,
  productionImportReconciliationSchema,
} from "./validation";
import {
  confirmProductionSusImport,
  reconcileProductionSusImport,
} from "./repository";

function value(formData: FormData, key: string): string {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

function getAdminId(admin: unknown): string {
  const result = z.object({ id: z.string().min(1) }).safeParse(admin);
  if (!result.success) throw new Error("A sessão administrativa é inválida.");
  return result.data.id;
}

async function readCsv(formData: FormData) {
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("Selecione um arquivo CSV.");
  if (file.size > MAX_SUS_CSV_BYTES)
    throw new Error("O arquivo CSV excede o limite de 2 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_SUS_CSV_BYTES)
    throw new Error("O arquivo CSV excede o limite de 2 MB.");
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("O CSV precisa estar codificado em UTF-8.");
  }
  return { content, hash: createHash("sha256").update(bytes).digest("hex") };
}

export async function previewProductionSusCsvAction(
  _previous: ProductionImportActionState,
  formData: FormData,
): Promise<ProductionImportActionState> {
  const admin = await requireProductionAdmin();
  try {
    const adminId = getAdminId(admin);
    const { content, hash } = await readCsv(formData);
    const delimiter = value(formData, "delimiter");
    if (delimiter !== ";" && delimiter !== ",")
      throw new Error("Selecione um delimitador CSV válido.");
    const document = parseSusCsv(content, delimiter);
    const rawColumns = value(formData, "columns");
    if (!rawColumns) {
      return {
        status: "headers",
        message: "Selecione as colunas administrativas do arquivo.",
        headers: document.headers,
      };
    }
    let raw: unknown;
    try {
      raw = JSON.parse(rawColumns);
    } catch {
      throw new Error("Selecione as colunas do arquivo novamente.");
    }
    const parsedRequest = productionCsvRequestSchema.safeParse({
      referencePeriod: value(formData, "reference_period"),
      delimiter,
      columns: raw,
    });
    if (!parsedRequest.success)
      throw new Error("Informe competência e mapeamento válidos.");
    const groups = summarizeSusRows(document, parsedRequest.data.columns);
    const previewHash = hashProductionPreviewContext({
      fileHash: hash,
      referencePeriod: parsedRequest.data.referencePeriod,
      delimiter,
      columns: parsedRequest.data.columns,
    });
    return {
      status: "preview",
      message:
        "Prévia validada. Confirme os vínculos manuais antes de importar.",
      headers: document.headers,
      groups,
      rowCount: document.rows.length,
      previewToken: issueFiscalPreviewEvidence(
        previewHash,
        adminId,
        getNeonServerEnv().authCookieSecret,
      ),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível validar o CSV.",
    };
  }
}

export async function confirmProductionSusImportAction(
  formData: FormData,
): Promise<never> {
  const admin = await requireProductionAdmin();
  let result: Awaited<ReturnType<typeof confirmProductionSusImport>>;
  try {
    const adminId = getAdminId(admin);
    const { content, hash } = await readCsv(formData);
    let columns: unknown;
    let mappings: unknown;
    try {
      columns = JSON.parse(value(formData, "columns"));
      mappings = JSON.parse(value(formData, "mappings"));
    } catch {
      throw new Error("Revise o mapeamento e gere uma nova prévia.");
    }
    const parsed = productionImportConfirmationSchema.safeParse({
      referencePeriod: value(formData, "reference_period"),
      delimiter: value(formData, "delimiter"),
      columns,
      previewToken: value(formData, "preview_token"),
      mappings,
    });
    if (!parsed.success)
      throw new Error("Revise os campos e gere uma nova prévia.");
    const document = parseSusCsv(content, parsed.data.delimiter);
    const previewHash = hashProductionPreviewContext({
      fileHash: hash,
      referencePeriod: parsed.data.referencePeriod,
      delimiter: parsed.data.delimiter,
      columns: parsed.data.columns,
    });
    if (
      !verifyFiscalPreviewEvidence(
        parsed.data.previewToken,
        previewHash,
        adminId,
        getNeonServerEnv().authCookieSecret,
      )
    ) {
      throw new Error("A prévia é inválida ou expirou. Gere uma nova prévia.");
    }
    const rows = mapSusRowsToProcedures(
      document,
      parsed.data.columns,
      parsed.data.mappings,
    );
    result = await confirmProductionSusImport({
      fileSha256: hash,
      referencePeriod: parseProductionImportPeriod(parsed.data.referencePeriod),
      rows,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível confirmar a importação.";
    redirect(`/producao/importacoes?erro=${encodeURIComponent(message)}`);
  }
  revalidatePath("/producao/importacoes");
  revalidatePath("/producao/lancamentos");
  revalidatePath("/producao");
  redirect(
    `/producao/importacoes?resultado=${result.pending_group_count > 0 ? "reconciliar" : "confirmado"}`,
  );
}

export async function reconcileProductionSusImportAction(
  formData: FormData,
): Promise<never> {
  await requireProductionAdmin();
  const parsed = productionImportReconciliationSchema.safeParse({
    import_id: value(formData, "import_id"),
    procedure_id: value(formData, "procedure_id"),
    source_type: value(formData, "source_type"),
    resolution: value(formData, "resolution"),
    expected_entry_id: value(formData, "expected_entry_id"),
    expected_quantity: value(formData, "expected_quantity"),
    expected_procedure_id: value(formData, "expected_procedure_id"),
    expected_reference_period: value(formData, "expected_reference_period"),
    expected_source: value(formData, "expected_source"),
    expected_counting_unit: value(formData, "expected_counting_unit"),
  });
  if (!parsed.success) redirect("/producao/importacoes?erro=reconciliacao");
  try {
    await reconcileProductionSusImport(parsed.data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a reconciliação.";
    redirect(`/producao/importacoes?erro=${encodeURIComponent(message)}`);
  }
  revalidatePath("/producao/importacoes");
  revalidatePath("/producao/lancamentos");
  revalidatePath("/producao");
  redirect("/producao/importacoes?resultado=reconciliado");
}
