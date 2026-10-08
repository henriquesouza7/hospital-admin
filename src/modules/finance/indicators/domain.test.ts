import { describe, expect, it } from "vitest";
import {
  amountToCents,
  buildIndicatorsData,
  buildPriceGroups,
  calculateSavingsOpportunities,
  compareConsecutivePrices,
  currencyChartScale,
  currencyChartValue,
  getHistoricalPriceHistory,
  getLargestIncreases,
  topSavingsOpportunities,
  type IndicatorFairExpense,
  type IndicatorPurchase,
} from "./domain";

const period = { inicio: "2026-01", fim: "2026-03", setor: "todos" as const };
const productId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherProductId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const supplierOne = "11111111-1111-4111-8111-111111111111";
const supplierTwo = "22222222-2222-4222-8222-222222222222";

describe("financial chart precision", () => {
  it("should_scale_bigint_chart_values_without_losing_exact_totals", () => {
    const cents = amountToCents("90071992547409.93");
    const scale = currencyChartScale([cents]);

    expect(cents).toBe(BigInt("9007199254740993"));
    expect(scale).toBe(BigInt(10_000_000));
    expect(currencyChartValue(cents, scale)).toBe(900_719_925);
  });
});

function purchase(
  overrides: Partial<IndicatorPurchase> = {},
): IndicatorPurchase {
  const id = overrides.id ?? "33333333-3333-4333-8333-333333333333";
  return {
    id,
    sector: "farmacia",
    productId,
    supplierId: supplierOne,
    supplierName: "Fornecedor Alfa",
    orderDate: "2026-01-15",
    quantity: "1.000",
    unitPrice: "10.00",
    lineTotal: "10.00",
    productName: "Produto histórico",
    presentation: "Caixa 20",
    category: "Medicamento",
    ...overrides,
  };
}

describe("financial indicators domain", () => {
  it("should_sum_pharmacy_laboratory_and_fair_in_month_and_total_when_all_have_records", () => {
    const purchases = [
      purchase({ lineTotal: "10.00" }),
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        sector: "laboratorio",
        lineTotal: "20.00",
      }),
    ];
    const fair: IndicatorFairExpense[] = [
      { competence: "2026-01-01", totalAmount: "30.00" },
    ];
    const result = buildIndicatorsData(period, purchases, fair);
    expect(result.pharmacyCents).toBe(BigInt(1000));
    expect(result.laboratoryCents).toBe(BigInt(2000));
    expect(result.fairCents).toBe(BigInt(3000));
    expect(result.totalCents).toBe(BigInt(6000));
    expect(result.monthly[0]).toMatchObject({
      month: "2026-01",
      totalCents: BigInt(6000),
      hasRecords: true,
    });
    expect(result.monthly).toHaveLength(3);
    expect(result.monthly[1]).toMatchObject({
      month: "2026-02",
      totalCents: BigInt(0),
      hasRecords: false,
    });
  });

  it("should_keep_consolidated_sector_totals_when_purchase_analysis_is_filtered", () => {
    const result = buildIndicatorsData(
      { ...period, setor: "farmacia" },
      [
        purchase({ lineTotal: "10.00" }),
        purchase({
          id: "44444444-4444-4444-8444-444444444444",
          sector: "laboratorio",
          lineTotal: "20.00",
        }),
      ],
      [{ competence: "2026-01-01", totalAmount: "30.00" }],
    );
    expect(result.totalCents).toBe(BigInt(6000));
    expect(result.purchases.map((item) => item.sector)).toEqual(["farmacia"]);
  });

  it("should_include_fair_only_in_consolidated_and_monthly_data", () => {
    const fair = [{ competence: "2026-02-01", totalAmount: "5.00" }];
    const result = buildIndicatorsData(period, [], fair);
    expect(result.fairCents).toBe(BigInt(500));
    expect(result.monthly[1].fairCents).toBe(BigInt(500));
    expect(buildPriceGroups(result.purchases)).toEqual([]);
    expect(calculateSavingsOpportunities(result.purchases)).toEqual([]);
  });

  it("should_group_presentations_after_trim_and_case_folding_only", () => {
    const groups = buildPriceGroups([
      purchase(),
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        presentation: " caixa 20 ",
      }),
      purchase({
        id: "55555555-5555-4555-8555-555555555555",
        presentation: "Caixa c/ 20",
      }),
    ]);
    expect(groups).toHaveLength(2);
    expect(
      groups.find((group) => group.observations.length === 2)?.key,
    ).toContain(productId);
  });

  it("should_keep_sectors_and_products_separate_in_price_comparisons", () => {
    const groups = buildPriceGroups([
      purchase(),
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        sector: "laboratorio",
      }),
      purchase({
        id: "55555555-5555-4555-8555-555555555555",
        productId: otherProductId,
      }),
    ]);
    expect(groups).toHaveLength(3);
  });

  it("should_compare_prices_in_chronological_order_and_calculate_difference_and_percentage", () => {
    const changes = compareConsecutivePrices([
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        orderDate: "2026-02-10",
        unitPrice: "12.00",
        lineTotal: "12.00",
      }),
      purchase({
        id: "33333333-3333-4333-8333-333333333333",
        orderDate: "2026-01-10",
        unitPrice: "10.00",
      }),
    ]);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      differenceCents: BigInt(200),
      percentageBasisPoints: BigInt(2000),
    });
  });

  it("should_skip_price_changes_when_equivalent_purchases_share_the_same_date", () => {
    const sameDayPurchases = [
      purchase({
        id: "33333333-3333-4333-8333-333333333333",
        orderDate: "2026-02-10",
        unitPrice: "10.00",
      }),
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        orderDate: "2026-02-10",
        unitPrice: "12.00",
        lineTotal: "12.00",
        presentation: " caixa 20 ",
        supplierId: supplierTwo,
      }),
    ];

    expect(compareConsecutivePrices(sameDayPurchases)).toEqual([]);
    expect(getLargestIncreases(sameDayPurchases)).toEqual([]);
  });

  it("should_skip_transitions_touching_a_date_with_ambiguous_purchase_order", () => {
    const changes = compareConsecutivePrices([
      purchase({ orderDate: "2026-01-10", unitPrice: "10.00" }),
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        orderDate: "2026-02-10",
        unitPrice: "11.00",
      }),
      purchase({
        id: "55555555-5555-4555-8555-555555555555",
        orderDate: "2026-02-10",
        unitPrice: "12.00",
      }),
      purchase({
        id: "66666666-6666-4666-8666-666666666666",
        orderDate: "2026-03-10",
        unitPrice: "13.00",
      }),
    ]);

    expect(changes).toEqual([]);
  });

  it("should_leave_percentage_unavailable_when_previous_price_is_zero", () => {
    const changes = compareConsecutivePrices([
      purchase({
        orderDate: "2026-01-10",
        unitPrice: "0.00",
        lineTotal: "0.00",
      }),
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        orderDate: "2026-02-10",
        unitPrice: "12.00",
        lineTotal: "12.00",
      }),
    ]);
    expect(changes[0]).toMatchObject({
      differenceCents: BigInt(1200),
      percentageBasisPoints: null,
    });
  });

  it("should_choose_the_lowest_observed_price_and_represent_supplier_ties", () => {
    const group = buildPriceGroups([
      purchase({
        unitPrice: "9.00",
        supplierId: supplierOne,
        supplierName: "Alfa",
      }),
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        unitPrice: "9.00",
        supplierId: supplierTwo,
        supplierName: "Beta",
      }),
      purchase({
        id: "55555555-5555-4555-8555-555555555555",
        unitPrice: "12.00",
      }),
    ])[0];
    expect(group.lowestUnitPriceCents).toBe(BigInt(900));
    expect(group.highestUnitPriceCents).toBe(BigInt(1200));
    expect(group.rangeCents).toBe(BigInt(300));
    expect(group.bestSupplierNames).toEqual(["Alfa", "Beta"]);
    expect(group.suppliers).toHaveLength(2);
  });

  it("should_exclude_groups_with_one_supplier_from_potential_savings", () => {
    expect(
      calculateSavingsOpportunities([
        purchase({ unitPrice: "15.00", lineTotal: "15.00" }),
      ]),
    ).toEqual([]);
  });

  it("should_calculate_retrospective_savings_using_database_subtotal_rounding", () => {
    const results = calculateSavingsOpportunities([
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        supplierId: supplierOne,
        supplierName: "Alfa",
        quantity: "1.005",
        unitPrice: "10.00",
        lineTotal: "10.05",
      }),
      purchase({
        id: "55555555-5555-4555-8555-555555555555",
        supplierId: supplierTwo,
        supplierName: "Beta",
        quantity: "1.005",
        unitPrice: "9.99",
        lineTotal: "10.04",
      }),
    ]);
    expect(results[0]).toMatchObject({
      realSpendCents: BigInt(2009),
      benchmarkSpendCents: BigInt(2008),
      potentialSavingsCents: BigInt(1),
    });
  });

  it("should_never_report_negative_savings", () => {
    expect(
      calculateSavingsOpportunities([
        purchase({
          supplierId: supplierOne,
          unitPrice: "9.00",
          lineTotal: "9.00",
        }),
        purchase({
          id: "44444444-4444-4444-8444-444444444444",
          supplierId: supplierTwo,
          unitPrice: "10.00",
          lineTotal: "10.00",
        }),
      ])[0].potentialSavingsCents,
    ).toBeGreaterThanOrEqual(BigInt(0));
  });

  it("should_rank_opportunities_by_potential_savings_and_apply_limit", () => {
    const purchases = [
      purchase({
        supplierId: supplierOne,
        unitPrice: "10.00",
        lineTotal: "10.00",
      }),
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        supplierId: supplierTwo,
        unitPrice: "9.00",
        lineTotal: "9.00",
      }),
      purchase({
        id: "55555555-5555-4555-8555-555555555555",
        productId: otherProductId,
        supplierId: supplierOne,
        unitPrice: "20.00",
        lineTotal: "20.00",
      }),
      purchase({
        id: "66666666-6666-4666-8666-666666666666",
        productId: otherProductId,
        supplierId: supplierTwo,
        unitPrice: "10.00",
        lineTotal: "10.00",
      }),
    ];
    expect(topSavingsOpportunities(purchases, 1)[0].key).toContain(
      otherProductId,
    );
    expect(topSavingsOpportunities(purchases, 1)).toHaveLength(1);
  });

  it("should_show_only_positive_consecutive_price_increases", () => {
    const changes = getLargestIncreases([
      purchase({ orderDate: "2026-01-01", unitPrice: "10.00" }),
      purchase({
        id: "44444444-4444-4444-8444-444444444444",
        orderDate: "2026-02-01",
        unitPrice: "12.00",
        lineTotal: "12.00",
      }),
      purchase({
        id: "55555555-5555-4555-8555-555555555555",
        orderDate: "2026-03-01",
        unitPrice: "11.00",
        lineTotal: "11.00",
      }),
    ]);
    expect(changes).toHaveLength(1);
    expect(changes[0].differenceCents).toBe(BigInt(200));
  });

  it("should_return_history_in_reverse_chronological_order_using_snapshots", () => {
    const history = getHistoricalPriceHistory(
      [
        purchase({
          id: "44444444-4444-4444-8444-444444444444",
          orderDate: "2026-02-01",
          productName: "Nome novo",
          presentation: "Caixa 20",
        }),
        purchase({
          orderDate: "2026-01-01",
          productName: "Nome antigo",
          presentation: "Caixa 20",
        }),
      ],
      productId,
    );
    expect(history.map((item) => item.productName)).toEqual([
      "Nome novo",
      "Nome antigo",
    ]);
  });

  it("should_show_empty_month_series_without_inventing_records", () => {
    const data = buildIndicatorsData(period, [], []);
    expect(data.totalCents).toBe(BigInt(0));
    expect(
      data.monthly.every(
        (month) => !month.hasRecords && month.totalCents === BigInt(0),
      ),
    ).toBe(true);
    expect(data.purchases).toEqual([]);
  });
});
