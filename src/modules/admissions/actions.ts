"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { AdmissionsActionState } from "./action-state";
import { createDoctor, setDoctorActive, updateDoctor } from "./repository";
import {
  parseDoctorNameForm,
  parseDoctorStatusForm,
  parseDoctorUpdateForm,
} from "./validation";

function errorState(message: string): AdmissionsActionState {
  return { status: "error", message };
}

export async function createDoctorAction(
  _previous: AdmissionsActionState,
  formData: FormData,
): Promise<AdmissionsActionState> {
  await requireAdmin();
  const parsed = parseDoctorNameForm(formData);
  if (!parsed.success) {
    return errorState(
      parsed.error.issues[0]?.message ?? "Informe um nome válido.",
    );
  }

  try {
    await createDoctor(parsed.data);
  } catch {
    return errorState("Não foi possível cadastrar o médico. Tente novamente.");
  }

  revalidatePath("/internacoes");
  return { status: "success", message: "Médico cadastrado e ativo." };
}

export async function updateDoctorAction(
  _previous: AdmissionsActionState,
  formData: FormData,
): Promise<AdmissionsActionState> {
  await requireAdmin();
  const parsed = parseDoctorUpdateForm(formData);
  if (!parsed.success) {
    return errorState(
      parsed.error.issues[0]?.message ?? "Confira o nome informado.",
    );
  }

  try {
    await updateDoctor(parsed.data.id, parsed.data.name);
  } catch {
    return errorState("Não foi possível atualizar o médico. Tente novamente.");
  }

  revalidatePath("/internacoes");
  return { status: "success", message: "Nome do médico atualizado." };
}

export async function setDoctorActiveAction(
  _previous: AdmissionsActionState,
  formData: FormData,
): Promise<AdmissionsActionState> {
  await requireAdmin();
  const parsed = parseDoctorStatusForm(formData);
  if (!parsed.success) {
    return errorState("Não foi possível identificar o status solicitado.");
  }

  try {
    await setDoctorActive(parsed.data.id, parsed.data.active);
  } catch {
    return errorState("Não foi possível alterar o status. Tente novamente.");
  }

  revalidatePath("/internacoes");
  return {
    status: "success",
    message: parsed.data.active ? "Médico ativado." : "Médico inativado.",
  };
}
