import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireMinorSurgeriesAdmin } from "./access";
import {
  type SurgeryAppointment,
  type SurgeryDaySummary,
  type SurgeryPatient,
  type SurgeryWaitlistEntry,
  summarizeSurgeryDay,
} from "./domain";

const patientSchema = z.object({ id: z.string().uuid(), name: z.string() });
const daySchema = z.object({
  id: z.string().uuid(),
  procedure_date: z.iso.date(),
  capacity: z.number().int().positive(),
});
const appointmentSchema = z.object({
  id: z.string().uuid(),
  surgery_day_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  source_waitlist_id: z.string().uuid().nullable(),
  status: z.enum(["awaiting_confirmation", "confirmed", "cancelled"]),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
const waitlistSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  status: z.enum(["waiting", "transferred"]),
  transferred_at: z.iso.datetime({ offset: true }).nullable(),
  created_at: z.iso.datetime({ offset: true }),
});
const auditSchema = z.object({
  id: z.number(),
  actor_id: z.string().nullable(),
  actor_name: z.string().nullable(),
  subject: z.string(),
  entity_type: z.string(),
  entity_id: z.string().nullable(),
  action: z.string(),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.iso.datetime({ offset: true }),
});
const PAGE_SIZE = 1000;
const WAITLIST_HISTORY_PAGE_SIZE = 50;
const AUDIT_PAGE_SIZE = 50;
const PATIENT_SEARCH_PAGE_SIZE = 50;
const PATIENT_ID_BATCH_SIZE = 500;
const SURGERY_DAY_ID_BATCH_SIZE = 500;
const activeDayAppointmentSchema = z.object({
  surgery_day_id: z.string().uuid(),
  status: z.enum(["awaiting_confirmation", "confirmed"]),
});

type QueryResult = { data: unknown; error: unknown };

function ensureResult<T>(
  data: unknown,
  error: unknown,
  schema: z.ZodType<T>,
): T {
  if (error || data === null || data === undefined) {
    throw new Error(
      "Não foi possível carregar os dados de pequenas cirurgias.",
    );
  }
  return schema.parse(data);
}

async function fetchAllPages<T>(
  loadPage: (offset: number) => Promise<QueryResult>,
  schema: z.ZodType<T[]>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await loadPage(offset);
    const page = ensureResult(data, error, schema);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function listActiveAppointmentsByDayIds(dayIds: readonly string[]) {
  const appointments: z.infer<typeof activeDayAppointmentSchema>[] = [];

  for (
    let offset = 0;
    offset < dayIds.length;
    offset += SURGERY_DAY_ID_BATCH_SIZE
  ) {
    const batch = dayIds.slice(offset, offset + SURGERY_DAY_ID_BATCH_SIZE);
    const page = await fetchAllPages(
      async (pageOffset) =>
        await getNeonDataApiClient()
          .from("surgery_appointments")
          .select("surgery_day_id,status")
          .in("surgery_day_id", batch)
          .in("status", ["awaiting_confirmation", "confirmed"])
          .order("id", { ascending: true })
          .range(pageOffset, pageOffset + PAGE_SIZE - 1),
      z.array(activeDayAppointmentSchema),
    );
    appointments.push(...page);
  }

  return appointments;
}

async function listPatientsByIds(ids: readonly string[]) {
  if (ids.length === 0) return new Map<string, SurgeryPatient>();
  const uniqueIds = [...new Set(ids)];
  const patients = new Map<string, SurgeryPatient>();

  for (
    let offset = 0;
    offset < uniqueIds.length;
    offset += PATIENT_ID_BATCH_SIZE
  ) {
    const batch = uniqueIds.slice(offset, offset + PATIENT_ID_BATCH_SIZE);
    const { data, error } = await getNeonDataApiClient()
      .from("patients")
      .select("id,name")
      .in("id", batch);
    const page = ensureResult(data, error, z.array(patientSchema));
    for (const patient of page) patients.set(patient.id, patient);
  }

  return patients;
}

export async function searchSurgeryPatients(query: string, offset: number) {
  await requireMinorSurgeriesAdmin();
  const searchTerm =
    typeof query === "string" ? query.trim().slice(0, 160) : "";
  const safeOffset = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  const end = safeOffset + PATIENT_SEARCH_PAGE_SIZE;
  if (!Number.isSafeInteger(end))
    return { patients: [], offset: safeOffset, hasMore: false };

  let request = getNeonDataApiClient().from("patients").select("id,name");
  if (searchTerm) {
    const escapedTerm = searchTerm.replace(/[\\%_]/g, "\\$&");
    request = request.ilike("name", `%${escapedTerm}%`);
  }
  const { data, error } = await request
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(safeOffset, end);
  const rows = ensureResult(data, error, z.array(patientSchema));
  return {
    patients: rows.slice(0, PATIENT_SEARCH_PAGE_SIZE),
    offset: safeOffset,
    hasMore: rows.length > PATIENT_SEARCH_PAGE_SIZE,
  };
}

export async function listUpcomingSurgeryDays(): Promise<SurgeryDaySummary[]> {
  await requireMinorSurgeriesAdmin();
  const days = await fetchAllPages(
    async (offset) =>
      await getNeonDataApiClient()
        .from("surgery_days")
        .select("id,procedure_date,capacity")
        .gte("procedure_date", todayInSaoPaulo())
        .order("procedure_date", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
    z.array(daySchema),
  );
  if (days.length === 0) return [];

  const appointments = await listActiveAppointmentsByDayIds(
    days.map((day) => day.id),
  );

  return days.map((day) =>
    summarizeSurgeryDay(
      day,
      appointments.filter(
        (appointment) => appointment.surgery_day_id === day.id,
      ),
    ),
  );
}

export async function listAllSurgeryDays(): Promise<SurgeryDaySummary[]> {
  await requireMinorSurgeriesAdmin();
  const days = await fetchAllPages(
    async (offset) =>
      await getNeonDataApiClient()
        .from("surgery_days")
        .select("id,procedure_date,capacity")
        .order("procedure_date", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
    z.array(daySchema),
  );
  if (days.length === 0) return [];

  const appointments = await listActiveAppointmentsByDayIds(
    days.map((day) => day.id),
  );

  return days.map((day) =>
    summarizeSurgeryDay(
      day,
      appointments.filter(
        (appointment) => appointment.surgery_day_id === day.id,
      ),
    ),
  );
}

export async function getSurgeryDay(id: string) {
  await requireMinorSurgeriesAdmin();
  const { data, error } = await getNeonDataApiClient()
    .from("surgery_days")
    .select("id,procedure_date,capacity")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error("Não foi possível carregar o dia de cirurgia.");
  }
  if (data === null || data === undefined) return null;
  return daySchema.parse(data);
}

export async function listDayAppointments(
  dayId: string,
): Promise<SurgeryAppointment[]> {
  await requireMinorSurgeriesAdmin();
  const appointments = await fetchAllPages(
    async (offset) =>
      await getNeonDataApiClient()
        .from("surgery_appointments")
        .select(
          "id,surgery_day_id,patient_id,source_waitlist_id,status,created_at,updated_at",
        )
        .eq("surgery_day_id", dayId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
    z.array(appointmentSchema),
  );
  const patients = await listPatientsByIds(
    appointments.map((item) => item.patient_id),
  );
  return appointments.map((appointment) => ({
    ...appointment,
    patient: patients.get(appointment.patient_id) ?? {
      id: appointment.patient_id,
      name: "Cadastro indisponível",
    },
  }));
}

export async function listSurgeryWaitlist(transferPage = 1): Promise<{
  waiting: SurgeryWaitlistEntry[];
  transferred: SurgeryWaitlistEntry[];
  transferPage: number;
  hasMoreTransferred: boolean;
}> {
  await requireMinorSurgeriesAdmin();
  const safeTransferPage =
    Number.isSafeInteger(transferPage) && transferPage > 0 ? transferPage : 1;
  const [waiting, transferredPage] = await Promise.all([
    fetchAllPages(
      async (offset) =>
        await getNeonDataApiClient()
          .from("surgery_waitlist")
          .select("id,patient_id,status,transferred_at,created_at")
          .eq("status", "waiting")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1),
      z.array(waitlistSchema),
    ),
    (async () => {
      const start = (safeTransferPage - 1) * WAITLIST_HISTORY_PAGE_SIZE;
      const end = start + WAITLIST_HISTORY_PAGE_SIZE;
      if (!Number.isSafeInteger(end)) return [];
      const { data, error } = await getNeonDataApiClient()
        .from("surgery_waitlist")
        .select("id,patient_id,status,transferred_at,created_at")
        .eq("status", "transferred")
        .order("transferred_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, end);
      return ensureResult(data, error, z.array(waitlistSchema));
    })(),
  ]);
  const hasMoreTransferred =
    transferredPage.length > WAITLIST_HISTORY_PAGE_SIZE;
  const transferred = transferredPage.slice(0, WAITLIST_HISTORY_PAGE_SIZE);
  const entries = [...waiting, ...transferred];
  const patients = await listPatientsByIds(
    entries.map((entry) => entry.patient_id),
  );
  const withPatients = (rows: typeof entries) =>
    rows.map((entry) => ({
      ...entry,
      patient: patients.get(entry.patient_id) ?? {
        id: entry.patient_id,
        name: "Cadastro indisponível",
      },
    }));
  return {
    waiting: withPatients(waiting),
    transferred: withPatients(transferred),
    transferPage: safeTransferPage,
    hasMoreTransferred,
  };
}

export async function listAvailableSurgeryDays() {
  const days = await listUpcomingSurgeryDays();
  return days.filter((day) => day.occupied < day.capacity);
}

export async function listMinorSurgeryAudit(page = 1) {
  await requireMinorSurgeriesAdmin();
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * AUDIT_PAGE_SIZE;
  if (!Number.isSafeInteger(offset))
    return { events: [], page: safePage, hasMore: false };
  const { data, error } = await getNeonDataApiClient().rpc(
    "list_minor_surgery_audit",
    { p_offset: offset },
  );
  const rows = ensureResult(data, error, z.array(auditSchema));
  return {
    events: rows.slice(0, AUDIT_PAGE_SIZE),
    page: safePage,
    hasMore: rows.length > AUDIT_PAGE_SIZE,
  };
}

function throwRpcError(error: unknown, fallback: string): never {
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "23514")
      throw new Error("A capacidade está cheia ou abaixo da ocupação atual.");
    if (error.code === "23505")
      throw new Error(
        "Já existe um registro equivalente para essa pessoa ou data.",
      );
    if (error.code === "42501")
      throw new Error("A operação exige perfil administrador.");
    if (error.code === "P0002")
      throw new Error("O registro solicitado não está disponível.");
    if (error.code === "22023")
      throw new Error("Os dados enviados são inválidos.");
  }
  throw new Error(fallback);
}

async function callMutation(
  name: string,
  params: Record<string, string | number | null>,
) {
  await requireMinorSurgeriesAdmin();
  const { data, error } = await getNeonDataApiClient().rpc(name, params);
  if (error) throwRpcError(error, "Não foi possível salvar a alteração.");
  return data;
}

export async function createSurgeryDay(input: {
  procedure_date: string;
  capacity: number;
}) {
  const data = await callMutation("create_surgery_day", {
    p_procedure_date: input.procedure_date,
    p_capacity: input.capacity,
  });
  if (!z.string().uuid().safeParse(data).success)
    throw new Error("Não foi possível confirmar o dia.");
}

export async function updateSurgeryDayCapacity(input: {
  surgery_day_id: string;
  capacity: number;
}) {
  const data = await callMutation("update_surgery_day_capacity", {
    p_surgery_day_id: input.surgery_day_id,
    p_capacity: input.capacity,
  });
  if (data !== true)
    throw new Error("Não foi possível confirmar a capacidade.");
}

export async function createSurgeryAppointment(input: {
  surgery_day_id: string;
  patient_id: string | null;
  patient_name: string | null;
  status: "awaiting_confirmation" | "confirmed";
}) {
  const data = await callMutation("create_surgery_appointment", {
    p_surgery_day_id: input.surgery_day_id,
    p_patient_id: input.patient_id,
    p_patient_name: input.patient_name,
    p_status: input.status,
  });
  if (!z.string().uuid().safeParse(data).success)
    throw new Error("Não foi possível confirmar o agendamento.");
}

export async function updateSurgeryAppointmentStatus(input: {
  appointment_id: string;
  status: string;
}) {
  const data = await callMutation("update_surgery_appointment_status", {
    p_appointment_id: input.appointment_id,
    p_status: input.status,
  });
  if (data !== true) throw new Error("Não foi possível atualizar o status.");
}

export async function createSurgeryWaitlistEntry(input: {
  patient_id: string | null;
  patient_name: string | null;
}) {
  const data = await callMutation("create_surgery_waitlist_entry", {
    p_patient_id: input.patient_id,
    p_patient_name: input.patient_name,
  });
  if (!z.string().uuid().safeParse(data).success)
    throw new Error("Não foi possível confirmar a inclusão na fila.");
}

export async function transferSurgeryWaitlistEntry(input: {
  waitlist_id: string;
  surgery_day_id: string;
}) {
  const data = await callMutation("transfer_surgery_waitlist_entry", {
    p_waitlist_id: input.waitlist_id,
    p_surgery_day_id: input.surgery_day_id,
  });
  if (!z.string().uuid().safeParse(data).success)
    throw new Error("Não foi possível confirmar a transferência.");
}

export async function updateSurgeryPatient(input: {
  patient_id: string;
  name: string;
}) {
  const data = await callMutation("update_surgery_patient", {
    p_patient_id: input.patient_id,
    p_name: input.name,
  });
  if (data !== true) throw new Error("Não foi possível atualizar o cadastro.");
}
