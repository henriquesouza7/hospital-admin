import { createHash } from "node:crypto";
import type { ProductionCsvColumns } from "./domain";

export function hashProductionPreviewContext(input: {
  fileHash: string;
  referencePeriod: string;
  delimiter: "," | ";";
  columns: ProductionCsvColumns;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        fileHash: input.fileHash,
        referencePeriod: input.referencePeriod,
        delimiter: input.delimiter,
        columns: input.columns,
      }),
    )
    .digest("hex");
}
