import { describe, expect, it } from "vitest";
import { formatOperationalTimestamp } from "./date-time";

describe("formatOperationalTimestamp", () => {
  it("should_use_sao_paulo_date_when_timestamp_crosses_utc_midnight", () => {
    expect(formatOperationalTimestamp("2026-10-08T01:30:00Z")).toBe(
      "07/10/2026, 22:30",
    );
  });

  it("should_format_common_timestamp_in_sao_paulo", () => {
    expect(formatOperationalTimestamp("2026-10-08T16:00:00Z")).toBe(
      "08/10/2026, 13:00",
    );
  });

  it("should_format_date_only_timestamp_in_sao_paulo", () => {
    expect(formatOperationalTimestamp("2026-10-08T01:30:00Z", "date")).toBe(
      "07/10/2026",
    );
  });
});
