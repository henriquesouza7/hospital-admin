"use server";

import { revalidatePath } from "next/cache";
import { getNeonServerEnv } from "@/lib/neon/env";
import { requireAdmin } from "@/lib/auth/require-admin";
import { importAdmissionEntries, listDoctors } from "./repository";
import {
  hashAdmissionCsv,
  issueAdmissionCsvEvidence,
  MAX_ADMISSION_CSV_BYTES,
  parseAdmissionCsv,
  verifyAdmissionCsvEvidence,
  type AdmissionImportRow,
} from "./import";

export type AdmissionImportState =
  | { status: "idle"; message: string }
  | { status: "error"; message: string }
  | {
      status: "success";
      message: string;
      rows: AdmissionImportRow[];
      token: string;
    };

async function readCsv(
  formData: FormData,
): Promise<{ bytes: Uint8Array; text: string }> {
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("Selecione um arquivo CSV.");
  if (file.size > MAX_ADMISSION_CSV_BYTES)
    throw new Error("O arquivo CSV deve ter até 1 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("O CSV precisa estar codificado em UTF-8.");
  }
  return { bytes, text };
}

export async function previewAdmissionCsvAction(
  _previous: AdmissionImportState,
  formData: FormData,
): Promise<AdmissionImportState> {
  const admin = await requireAdmin();
  try {
    const { bytes, text } = await readCsv(formData);
    const doctors = (await listDoctors()).map(({ id, name, active }) => ({
      id,
      name,
      active,
    }));
    const rows = parseAdmissionCsv(text, doctors);
    return {
      status: "success",
      message: rows.some((row) => row.error)
        ? "Corrija as linhas indicadas antes de confirmar."
        : "Prévia válida. Confirme para persistir os lançamentos.",
      rows,
      token: issueAdmissionCsvEvidence(
        hashAdmissionCsv(bytes),
        admin.id,
        getNeonServerEnv().authCookieSecret,
      ),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Não foi possível ler o CSV.",
    };
  }
}

export async function confirmAdmissionCsvAction(
  _previous: AdmissionImportState,
  formData: FormData,
): Promise<AdmissionImportState> {
  const admin = await requireAdmin();
  try {
    const { bytes, text } = await readCsv(formData);
    const token = formData.get("preview_token");
    if (
      typeof token !== "string" ||
      !verifyAdmissionCsvEvidence(
        token,
        hashAdmissionCsv(bytes),
        admin.id,
        getNeonServerEnv().authCookieSecret,
      )
    )
      throw new Error("A prévia é inválida ou expirou. Gere uma nova prévia.");
    const doctors = (await listDoctors()).map(({ id, name, active }) => ({
      id,
      name,
      active,
    }));
    const rows = parseAdmissionCsv(text, doctors);
    const invalidRow = rows.find((row) => row.error);
    if (invalidRow)
      throw new Error(`Revise a linha ${invalidRow.line}: ${invalidRow.error}`);
    const imported = await importAdmissionEntries(
      rows.map(({ entry_date, doctor_name, quantity }) => ({
        entry_date,
        doctor_name,
        quantity,
      })),
    );
    revalidatePath("/internacoes");
    revalidatePath("/internacoes/lancamentos");
    return {
      status: "success",
      message: `${imported} lançamento(s) importado(s).`,
      rows: [],
      token: "",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a importação.",
    };
  }
}
