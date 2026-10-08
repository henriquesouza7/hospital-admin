import { describe, expect, it } from "vitest";
import { hashProductionPreviewContext } from "./preview-context";

const base = {
  fileHash: "a".repeat(64),
  referencePeriod: "2026-10",
  delimiter: ";" as const,
  columns: { code: 0, procedure: 1, quantity: 2, sourceType: 3 },
};

describe("production import preview context", () => {
  it("should_bind_preview_evidence_to_file_and_import_configuration", () => {
    const hash = hashProductionPreviewContext(base);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(
      hashProductionPreviewContext({ ...base, referencePeriod: "2026-11" }),
    ).not.toBe(hash);
    expect(hashProductionPreviewContext({ ...base, delimiter: "," })).not.toBe(
      hash,
    );
    expect(
      hashProductionPreviewContext({
        ...base,
        columns: { ...base.columns, quantity: 3 },
      }),
    ).not.toBe(hash);
    expect(
      hashProductionPreviewContext({ ...base, fileHash: "b".repeat(64) }),
    ).not.toBe(hash);
  });
});
