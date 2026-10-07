export type AdmissionsActionState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
}>;

export const initialAdmissionsActionState: AdmissionsActionState = {
  status: "idle",
  message: "",
};
