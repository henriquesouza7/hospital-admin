"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { AdmissionsActionState } from "./action-state";
import {
  createAdmissionEntry,
  createAdmissionTarget,
  createDoctor,
  setDoctorActive,
  updateAdmissionEntry,
  updateAdmissionTarget,
  updateDoctor,
} from "./repository";
import {
  parseDoctorNameForm,
  parseDoctorStatusForm,
  parseDoctorUpdateForm,
  parseEntryCreateForm,
  parseEntryUpdateForm,
  parseTargetCreateForm,
  parseTargetUpdateForm,
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
  revalidatePath("/internacoes/medicos");
  revalidatePath("/internacoes/medicos/[id]", "page");
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
  revalidatePath("/internacoes/medicos");
  revalidatePath("/internacoes/medicos/[id]", "page");
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
  revalidatePath("/internacoes/medicos");
  revalidatePath("/internacoes/medicos/[id]", "page");
  return {
    status: "success",
    message: parsed.data.active ? "Médico ativado." : "Médico inativado.",
  };
}

export async function createAdmissionEntryAction(
  _previous: AdmissionsActionState,
  formData: FormData,
): Promise<AdmissionsActionState> {
  await requireAdmin();
  const parsed = parseEntryCreateForm(formData);
  if (!parsed.success)
    return errorState(
      parsed.error.issues[0]?.message ?? "Confira os dados do lançamento.",
    );
  try {
    await createAdmissionEntry({
      doctorId: parsed.data.doctor_id,
      entryDate: parsed.data.entry_date,
      quantity: parsed.data.quantity,
    });
    revalidatePath("/internacoes");
    revalidatePath("/internacoes/lancamentos");
    return { status: "success", message: "Lançamento registrado." };
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Não foi possível salvar o lançamento.",
    );
  }
}

export async function updateAdmissionEntryAction(
  _previous: AdmissionsActionState,
  formData: FormData,
): Promise<AdmissionsActionState> {
  await requireAdmin();
  const parsed = parseEntryUpdateForm(formData);
  if (!parsed.success)
    return errorState(
      parsed.error.issues[0]?.message ?? "Confira a quantidade informada.",
    );
  try {
    await updateAdmissionEntry({
      id: parsed.data.id,
      quantity: parsed.data.quantity,
    });
    revalidatePath("/internacoes");
    revalidatePath("/internacoes/lancamentos");
    revalidatePath("/internacoes/medicos/[id]", "page");
    return { status: "success", message: "Lançamento atualizado." };
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o lançamento.",
    );
  }
}

export async function createAdmissionTargetAction(
  _previous: AdmissionsActionState,
  formData: FormData,
): Promise<AdmissionsActionState> {
  await requireAdmin();
  const parsed = parseTargetCreateForm(formData);
  if (!parsed.success)
    return errorState(
      parsed.error.issues[0]?.message ?? "Confira os dados da meta.",
    );
  try {
    await createAdmissionTarget({
      periodType: parsed.data.period_type,
      referencePeriod: parsed.data.reference_period,
      quantity: parsed.data.target_quantity,
    });
    revalidatePath("/internacoes");
    revalidatePath("/internacoes/metas");
    return { status: "success", message: "Meta cadastrada." };
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Não foi possível salvar a meta.",
    );
  }
}

export async function updateAdmissionTargetAction(
  _previous: AdmissionsActionState,
  formData: FormData,
): Promise<AdmissionsActionState> {
  await requireAdmin();
  const parsed = parseTargetUpdateForm(formData);
  if (!parsed.success)
    return errorState(
      parsed.error.issues[0]?.message ?? "Confira a quantidade da meta.",
    );
  try {
    await updateAdmissionTarget({
      id: parsed.data.id,
      quantity: parsed.data.target_quantity,
    });
    revalidatePath("/internacoes");
    revalidatePath("/internacoes/metas");
    return { status: "success", message: "Meta atualizada." };
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a meta.",
    );
  }
}
