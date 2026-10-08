import type { ProductionImportGroup } from "./domain";

export type ProductionImportActionState = Readonly<{
  status: "idle" | "headers" | "preview" | "error";
  message: string;
  headers?: readonly string[];
  groups?: readonly ProductionImportGroup[];
  previewToken?: string;
  rowCount?: number;
}>;

export const initialProductionImportActionState: ProductionImportActionState = {
  status: "idle",
  message: "",
};
