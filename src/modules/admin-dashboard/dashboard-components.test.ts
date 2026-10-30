import { describe, expect, it } from "vitest";
import { getResponsiveMetricPresentation } from "../../lib/responsive-metric";
import { getDashboardMetricPresentation } from "./dashboard-components";

describe("dashboard module metric presentation", () => {
  it.each([
    ["small amount", "R$ 12,00", false],
    ["compact large amount", "R$ 90,1 tri", true],
    ["large amount", "R$ 90.071.992.547.948,30", true],
    ["negative large amount", "R$ -90.071.992.547.948,30", true],
    ["zero amount", "R$ 0,00", false],
    ["unavailable value", "Indisponível", false],
  ])("should_preserve_exact_value_for_%s", (_label, value, isLong) => {
    const presentation = getDashboardMetricPresentation(value);

    expect(presentation.value).toBe(value);
    expect(presentation.title).toBe(value);
    expect(presentation.className).toBe(
      isLong ? "whitespace-nowrap" : "text-3xl",
    );
    expect(presentation.style?.fontSize).toBe(
      isLong
        ? `clamp(1rem, calc(100cqi / ${value.length} / 0.6), 2.25rem)`
        : undefined,
    );
  });

  it.each([
    ["short values stay at the standard size", "R$ 0,00", false],
    ["long values fit their card", "R$ 90.071.992.548.042,30", true],
    ["long negative values keep the sign", "R$ -90.071.992.548.042,30", true],
    ["unavailable values remain explicit", "Indisponível", false],
  ])("should_adapt_shared_metric_presentation_%s", (_label, value, isLong) => {
    const presentation = getResponsiveMetricPresentation(value);

    expect(presentation.value).toBe(value);
    expect(presentation.title).toBe(value);
    expect(presentation.isLong).toBe(isLong);
    expect(presentation.style?.fontSize).toBe(
      isLong
        ? `clamp(1rem, calc(100cqi / ${value.length} / 0.6), 2.25rem)`
        : undefined,
    );
  });
});
