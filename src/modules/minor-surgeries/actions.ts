"use server";

import { revalidatePath } from "next/cache";
import {
  createSurgeryAppointment,
  createSurgeryDay,
  createSurgeryWaitlistEntry,
  transferSurgeryWaitlistEntry,
  updateSurgeryAppointmentStatus,
  updateSurgeryDayCapacity,
  updateSurgeryPatient,
} from "./repository";
import {
  parseSurgeryAppointmentForm,
  parseSurgeryAppointmentStatusForm,
  parseSurgeryDayCapacityForm,
  parseSurgeryDayForm,
  parseSurgeryPatientUpdateForm,
  parseSurgeryWaitlistForm,
  parseSurgeryWaitlistTransferForm,
} from "./validation";

export type MinorSurgeryActionState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
}>;

export const initialMinorSurgeryActionState: MinorSurgeryActionState = {
  status: "idle",
  message: "",
};

function errorState(message: string): MinorSurgeryActionState {
  return { status: "error", message };
}

function successState(message: string): MinorSurgeryActionState {
  return { status: "success", message };
}

function revalidateAll() {
  revalidatePath("/pequenas-cirurgias");
  revalidatePath("/pequenas-cirurgias/dias");
  revalidatePath("/pequenas-cirurgias/fila");
}

export async function createSurgeryDayAction(
  _previous: MinorSurgeryActionState,
  formData: FormData,
): Promise<MinorSurgeryActionState> {
  const parsed = parseSurgeryDayForm(formData);
  if (!parsed.success)
    return errorState("Informe uma data válida e capacidade maior que zero.");
  try {
    await createSurgeryDay(parsed.data);
  } catch (error) {
    return errorState(
      error instanceof Error ? error.message : "Não foi possível criar o dia.",
    );
  }
  revalidateAll();
  return successState("Dia de cirurgia criado.");
}

export async function updateSurgeryDayCapacityAction(
  _previous: MinorSurgeryActionState,
  formData: FormData,
): Promise<MinorSurgeryActionState> {
  const parsed = parseSurgeryDayCapacityForm(formData);
  if (!parsed.success) return errorState("Informe uma capacidade válida.");
  try {
    await updateSurgeryDayCapacity(parsed.data);
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a capacidade.",
    );
  }
  revalidateAll();
  return successState("Capacidade atualizada.");
}

export async function createSurgeryAppointmentAction(
  _previous: MinorSurgeryActionState,
  formData: FormData,
): Promise<MinorSurgeryActionState> {
  const parsed = parseSurgeryAppointmentForm(formData);
  if (!parsed.success)
    return errorState(
      "Selecione uma pessoa cadastrada ou informe um nome e revise o status.",
    );
  try {
    await createSurgeryAppointment(parsed.data);
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Não foi possível criar o agendamento.",
    );
  }
  revalidateAll();
  return successState("Agendamento criado.");
}

export async function updateSurgeryAppointmentStatusAction(
  _previous: MinorSurgeryActionState,
  formData: FormData,
): Promise<MinorSurgeryActionState> {
  const parsed = parseSurgeryAppointmentStatusForm(formData);
  if (!parsed.success) return errorState("Selecione um status válido.");
  try {
    await updateSurgeryAppointmentStatus(parsed.data);
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Não foi possível alterar o status.",
    );
  }
  revalidateAll();
  return successState("Status atualizado.");
}

export async function createSurgeryWaitlistEntryAction(
  _previous: MinorSurgeryActionState,
  formData: FormData,
): Promise<MinorSurgeryActionState> {
  const parsed = parseSurgeryWaitlistForm(formData);
  if (!parsed.success)
    return errorState(
      "Selecione uma pessoa cadastrada ou informe um novo nome.",
    );
  try {
    await createSurgeryWaitlistEntry(parsed.data);
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Não foi possível incluir na fila.",
    );
  }
  revalidateAll();
  return successState("Pessoa incluída na fila de espera.");
}

export async function transferSurgeryWaitlistEntryAction(
  _previous: MinorSurgeryActionState,
  formData: FormData,
): Promise<MinorSurgeryActionState> {
  const parsed = parseSurgeryWaitlistTransferForm(formData);
  if (!parsed.success)
    return errorState("Selecione um dia com vaga disponível.");
  try {
    await transferSurgeryWaitlistEntry(parsed.data);
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Não foi possível transferir a pessoa.",
    );
  }
  revalidateAll();
  return successState(
    "Transferência concluída; o cadastro da pessoa foi preservado.",
  );
}

export async function updateSurgeryPatientAction(
  _previous: MinorSurgeryActionState,
  formData: FormData,
): Promise<MinorSurgeryActionState> {
  const parsed = parseSurgeryPatientUpdateForm(formData);
  if (!parsed.success) return errorState("Informe um nome válido.");
  try {
    await updateSurgeryPatient(parsed.data);
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o cadastro.",
    );
  }
  revalidateAll();
  return successState("Cadastro administrativo atualizado.");
}
