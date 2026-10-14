import { describe, expect, it } from "vitest";
import { getEnvironmentLabel } from "./environment-label";

describe("environment label", () => {
  it.each([
    ["production", "Produção"],
    ["shared_demo", "Demonstração compartilhada"],
    ["isolated_homologation", "Homologação isolada"],
  ])("should_describe_%s_environment", (environment, label) => {
    expect(getEnvironmentLabel(environment)).toBe(label);
  });

  it("should_not_misidentify_an_unconfigured_environment", () => {
    expect(getEnvironmentLabel("unknown")).toBe("Ambiente não identificado");
  });
});
