import { describe, expect, it } from "vitest";
import {
  currentProductionCompetence,
  formatProductionCompetence,
} from "./domain";

describe("production competence formatting", () => {
  it("formats a month in Brazilian Portuguese", () => {
    expect(formatProductionCompetence("2026-03-01")).toBe("março de 2026");
  });

  it("uses the São Paulo calendar month", () => {
    expect(
      currentProductionCompetence(new Date("2026-03-01T02:00:00.000Z")),
    ).toBe("2026-02");
  });
});
