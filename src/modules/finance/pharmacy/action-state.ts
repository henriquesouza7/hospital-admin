export type FinanceActionState = Readonly<{
  status: "idle" | "success" | "error";
  message: string;
}>;

export const initialFinanceActionState: FinanceActionState = {
  status: "idle",
  message: "",
};
