import { describe, expect, it } from "vitest";
import { formatCompactCurrency, formatCurrency } from "./format";

describe("currency formatting", () => {
  it.each([
    [BigInt("120000"), "R$ 1,2 mil"],
    [BigInt("240000000"), "R$ 2,4 mi"],
    [BigInt("580000000000"), "R$ 5,8 bi"],
    [BigInt("9007199254794830"), "R$ 90,1 tri"],
  ])("should_format_large_amount_as_compact_currency", (cents, expected) => {
    expect(formatCompactCurrency(cents)).toBe(expected);
  });

  it("should_keep_exact_format_for_small_amounts", () => {
    expect(formatCompactCurrency(BigInt("12345"))).toBe("R$ 123,45");
  });

  it("should_preserve_the_sign_for_negative_amounts", () => {
    expect(formatCompactCurrency(-BigInt("120000"))).toBe("−R$ 1,2 mil");
    expect(formatCurrency(-BigInt("12345"))).toBe("−R$ 123,45");
  });

  it("should_format_zero_without_compaction", () => {
    expect(formatCompactCurrency(BigInt(0))).toBe("R$ 0,00");
  });
});
