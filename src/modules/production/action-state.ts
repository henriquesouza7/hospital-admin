export type ProductionActionState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
}>;

export const initialProductionActionState: ProductionActionState = {
  status: "idle",
  message: "",
};
