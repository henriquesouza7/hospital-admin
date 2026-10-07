import "server-only";

import { z } from "zod";
import { getNeonDataApiClient } from "@/lib/neon/data-api";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Doctor } from "./domain";

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
  const { data, error } = await getNeonDataApiClient()
    .from("doctors")
    .select("id,name,active,created_at,updated_at")
    .order("name", { ascending: true });

  if (error || data === null || data === undefined) {
    throw new Error("Não foi possível carregar a lista de médicos.");
  }

  return doctorsSchema.parse(data);
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
