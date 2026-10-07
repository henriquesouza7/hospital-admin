export type AdmissionsActionState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
}>;

export type AdmissionsNameInputState = Readonly<{
  value: string;
  actionState: AdmissionsActionState;
}>;

export const initialAdmissionsActionState: AdmissionsActionState = {
  status: "idle",
  message: "",
};

export function getAdmissionsNameInputValue(
  input: AdmissionsNameInputState,
  actionState: AdmissionsActionState,
): string {
  return actionState.status === "success" && input.actionState !== actionState
    ? ""
    : input.value;
}
