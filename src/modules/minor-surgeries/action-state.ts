export type MinorSurgeryActionState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
}>;

export const initialMinorSurgeryActionState: MinorSurgeryActionState = {
  status: "idle",
  message: "",
};
