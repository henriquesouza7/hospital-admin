import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { AdmissionEntry, AdmissionTarget, Doctor } from "./domain";

const doctorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(160),
  active: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

const doctorsSchema = z.array(doctorSchema);

export async function listDoctors(): Promise<Doctor[]> {
  await requireAdmin();
  return listAllDoctors(getNeonDataApiClient());
}

export async function createDoctor(name: string): Promise<void> {
  await requireAdmin();
  const { data, error } = await getNeonDataApiClient().rpc("create_doctor", {
    p_name: name,
  });

  if (error || !z.string().uuid().safeParse(data).success) {
    throw new Error("Não foi possível cadastrar o médico.");
  }
}

export async function updateDoctor(id: string, name: string): Promise<void> {
  await requireAdmin();
  const { data, error } = await getNeonDataApiClient().rpc("update_doctor", {
    p_id: id,
    p_name: name,
  });

  if (error || data !== true) {
    throw new Error("Não foi possível atualizar o médico.");
  }
}

export async function setDoctorActive(
  id: string,
  active: boolean,
): Promise<void> {
  await requireAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "set_doctor_active",
    { p_id: id, p_active: active },
  );

  if (error || data !== true) {
    throw new Error("Não foi possível alterar o status do médico.");
  }
}

const quantitySchema = z
  .union([z.number(), z.string()])
  .transform(Number)
  .pipe(z.number().int().nonnegative());
const entryRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    doctor_id: z.string().uuid(),
    entry_date: z.iso.date(),
    quantity: quantitySchema,
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
  }),
);
const admissionExportRowsSchema = z.array(
  z.object({
    entry_date: z.iso.date(),
    quantity: quantitySchema,
    doctor: z.object({ name: z.string().min(1) }),
  }),
);
const ADMISSION_EXPORT_PAGE_SIZE = 1000;
const targetRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    period_type: z.enum(["month", "year"]),
    reference_period: z.iso.date(),
    target_quantity: quantitySchema,
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
  }),
);
const DATA_API_PAGE_SIZE = 1_000;

function rpcErrorCode(error: unknown): string | undefined {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : undefined;
}

async function listAllDoctors(
  client: ReturnType<typeof getNeonDataApiClient>,
): Promise<Doctor[]> {
  const rawDoctors: unknown[] = [];
  let cursor: string | undefined;
  for (;;) {
    let query = client
      .from("doctors")
      .select("id,name,active,created_at,updated_at");
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query
      .order("id", { ascending: true })
      .limit(DATA_API_PAGE_SIZE);
    if (error || data === null || data === undefined) {
      throw new Error("Não foi possível carregar a lista de médicos.");
    }
    const page = doctorsSchema.parse(data);
    rawDoctors.push(...page);
    if (page.length < DATA_API_PAGE_SIZE) break;
    const lastDoctor = page.at(-1);
    if (!lastDoctor) {
      throw new Error("Não foi possível continuar a lista de médicos.");
    }
    cursor = lastDoctor.id;
  }
  return doctorsSchema
    .parse(rawDoctors)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id),
    );
}

export async function listAdmissionEntries(
  startDate: string,
  endDate: string,
  doctorId?: string,
): Promise<AdmissionEntry[]> {
  await requireAdmin();
  const client = getNeonDataApiClient();
  const { data, error } = await client.rpc("list_admission_entries", {
    p_start_date: startDate,
    p_end_date: endDate,
    p_doctor_id: doctorId ?? null,
  });
  if (error || data === null || data === undefined) {
    throw new Error("Não foi possível carregar os lançamentos de internações.");
  }
  const entries = entryRowsSchema.parse(data);
  const doctors = await listAllDoctors(client);
  const doctorsById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  return entries
    .map((entry) => {
      const doctor = doctorsById.get(entry.doctor_id);
      if (!doctor)
        throw new Error("O histórico referencia um médico inexistente.");
      return {
        ...entry,
        doctor_name: doctor.name,
        doctor_active: doctor.active,
      };
    })
    .sort(
      (a, b) =>
        b.entry_date.localeCompare(a.entry_date) || a.id.localeCompare(b.id),
    );
}

export async function listAdmissionEntriesForExport(
  startDate: string,
  endDate: string,
  maxRows: number,
) {
  await requireAdmin();
  if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 10_001) {
    throw new Error("O limite de linhas da exportação é inválido.");
  }
  const entries: Array<{
    entry_date: string;
    doctor_name: string;
    quantity: number;
  }> = [];
  for (let offset = 0; offset < maxRows; offset += ADMISSION_EXPORT_PAGE_SIZE) {
    const pageSize = Math.min(ADMISSION_EXPORT_PAGE_SIZE, maxRows - offset);
    const { data, error } = await getNeonDataApiClient()
      .from("admission_entries")
      .select("entry_date,quantity,doctor:doctors!inner(name)")
      .gte("entry_date", startDate)
      .lt("entry_date", endDate)
      .order("entry_date", { ascending: false })
      .order("doctor_id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error || data === null || data === undefined) {
      throw new Error(
        "Não foi possível carregar os lançamentos da exportação.",
      );
    }
    const rows = admissionExportRowsSchema.parse(data);
    entries.push(
      ...rows.map((entry) => ({
        entry_date: entry.entry_date,
        doctor_name: entry.doctor.name,
        quantity: entry.quantity,
      })),
    );
    if (rows.length < pageSize) break;
  }
  return entries;
}

export async function listAdmissionTargets(
  startDate: string,
  endDate: string,
): Promise<AdmissionTarget[]> {
  await requireAdmin();
  const client = getNeonDataApiClient();
  const rawTargets: unknown[] = [];
  let cursor: string | undefined;
  for (;;) {
    let query = client
      .from("admission_targets")
      .select(
        "id,period_type,reference_period,target_quantity,created_at,updated_at",
      )
      .gte("reference_period", startDate)
      .lt("reference_period", endDate);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query
      .order("id", { ascending: true })
      .limit(DATA_API_PAGE_SIZE);
    if (error || data === null || data === undefined) {
      throw new Error("Não foi possível carregar as metas de internações.");
    }
    const page = targetRowsSchema.parse(data);
    rawTargets.push(...page);
    if (page.length < DATA_API_PAGE_SIZE) break;
    const lastTarget = page.at(-1);
    if (!lastTarget) {
      throw new Error("Não foi possível continuar a lista de metas.");
    }
    cursor = lastTarget.id;
  }
  return targetRowsSchema
    .parse(rawTargets)
    .sort(
      (a, b) =>
        b.reference_period.localeCompare(a.reference_period) ||
        a.id.localeCompare(b.id),
    );
}

export async function createAdmissionEntry(input: {
  doctorId: string;
  entryDate: string;
  quantity: number;
}): Promise<void> {
  await requireAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "create_admission_entry",
    {
      p_doctor_id: input.doctorId,
      p_entry_date: input.entryDate,
      p_quantity: input.quantity,
    },
  );
  if (error) {
    if (rpcErrorCode(error) === "23505")
      throw new Error("Já existe um lançamento para esse médico nessa data.");
    if (rpcErrorCode(error) === "22023")
      throw new Error(
        "O médico deve estar ativo e os dados do lançamento precisam ser válidos.",
      );
    throw new Error("Não foi possível salvar o lançamento.");
  }
  if (!z.string().uuid().safeParse(data).success)
    throw new Error("Não foi possível confirmar o lançamento.");
}

export async function updateAdmissionEntry(input: {
  id: string;
  quantity: number;
}): Promise<void> {
  await requireAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "update_admission_entry",
    { p_id: input.id, p_quantity: input.quantity },
  );
  if (error || data !== true)
    throw new Error("Não foi possível atualizar o lançamento.");
}

export async function createAdmissionTarget(input: {
  periodType: "month" | "year";
  referencePeriod: string;
  quantity: number;
}): Promise<void> {
  await requireAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "create_admission_target",
    {
      p_period_type: input.periodType,
      p_reference_period: input.referencePeriod,
      p_target_quantity: input.quantity,
    },
  );
  if (error) {
    if (rpcErrorCode(error) === "23505")
      throw new Error("Já existe uma meta para esse período.");
    throw new Error("Não foi possível salvar a meta.");
  }
  if (!z.string().uuid().safeParse(data).success)
    throw new Error("Não foi possível confirmar a meta.");
}

export async function updateAdmissionTarget(input: {
  id: string;
  quantity: number;
}): Promise<void> {
  await requireAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "update_admission_target",
    { p_id: input.id, p_target_quantity: input.quantity },
  );
  if (error || data !== true)
    throw new Error("Não foi possível atualizar a meta.");
}

export async function importAdmissionEntries(
  rows: readonly {
    entry_date: string;
    doctor_name: string;
    quantity: number;
  }[],
): Promise<number> {
  await requireAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(
    "import_admission_entries",
    { p_rows: rows },
  );
  if (error) {
    if (rpcErrorCode(error) === "23505")
      throw new Error(
        "A importação contém um lançamento já existente para médico e data.",
      );
    if (rpcErrorCode(error) === "22023")
      throw new Error(
        "Revise a importação: médico inexistente, ambíguo, inativo ou linha inválida.",
      );
    throw new Error("Não foi possível concluir a importação.");
  }
  const parsed = z.number().int().positive().safeParse(data);
  if (!parsed.success)
    throw new Error("A importação não retornou a quantidade persistida.");
  return parsed.data;
}
