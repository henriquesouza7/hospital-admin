import { calculateLineTotalCents } from "../pharmacy/validation";
import type { IndicatorsFilters } from "./validation";

export function amountToCents(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error("Valor monetário inválido recebido do banco.");
  return (
    BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"))
  );
}

export function currencyChartScale(amounts: readonly bigint[]): bigint {
  const maximum = amounts.reduce(
    (largest, amount) => (amount > largest ? amount : largest),
    BigInt(0),
  );
  let scale = BigInt(100);
  while (maximum / scale > BigInt(1_000_000_000)) scale *= BigInt(10);
  return scale;
}

export function currencyChartValue(cents: bigint, scale: bigint): number {
  const whole = cents / scale;
  const remainder = cents % scale;
  const fractional = (remainder * BigInt(1_000_000)) / scale;
  return Number(whole) + Number(fractional) / 1_000_000;
}

export type IndicatorPurchase = Readonly<{
  id: string;
  sector: "farmacia" | "laboratorio";
  productId: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  productName: string;
  presentation: string;
  category: string | null;
}>;

export type IndicatorFairExpense = Readonly<{
  competence: string;
  totalAmount: string;
}>;

export type MonthlyIndicator = Readonly<{
  month: string;
  pharmacyCents: bigint;
  laboratoryCents: bigint;
  fairCents: bigint;
  totalCents: bigint;
  hasRecords: boolean;
  hasPharmacyRecords: boolean;
  hasLaboratoryRecords: boolean;
  hasFairRecords: boolean;
}>;

export type PriceGroup = Readonly<{
  key: string;
  sector: "farmacia" | "laboratorio";
  productId: string;
  name: string;
  presentation: string;
  category: string | null;
  suppliers: readonly { id: string; name: string }[];
  lowestUnitPriceCents: bigint;
  bestSupplierNames: readonly string[];
  highestUnitPriceCents: bigint;
  rangeCents: bigint;
  observations: readonly IndicatorPurchase[];
}>;

export type PriceChange = Readonly<{
  previous: IndicatorPurchase;
  current: IndicatorPurchase;
  differenceCents: bigint;
  percentageBasisPoints: bigint | null;
}>;

export type SavingsOpportunity = Readonly<{
  key: string;
  sector: "farmacia" | "laboratorio";
  name: string;
  presentation: string;
  realSpendCents: bigint;
  benchmarkSpendCents: bigint;
  potentialSavingsCents: bigint;
  suppliers: number;
}>;

export type IndicatorsData = Readonly<{
  pharmacyCents: bigint;
  laboratoryCents: bigint;
  fairCents: bigint;
  totalCents: bigint;
  monthly: readonly MonthlyIndicator[];
  purchases: readonly IndicatorPurchase[];
  fairExpenses: readonly IndicatorFairExpense[];
  pharmacyItemCount: number;
  laboratoryItemCount: number;
}>;

function toCents(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error("Valor monetário inválido recebido do banco.");
  return (
    BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"))
  );
}

function monthList(start: string, end: string): string[] {
  const [year, month] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const months: string[] = [];
  for (
    let cursor = new Date(Date.UTC(year, month - 1, 1));
    cursor.getUTCFullYear() < endYear ||
    (cursor.getUTCFullYear() === endYear && cursor.getUTCMonth() < endMonth);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  ) {
    months.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months;
}

export function normalizePresentation(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function getPriceGroupKey(purchase: IndicatorPurchase): string {
  return `${purchase.sector}:${purchase.productId}:${normalizePresentation(purchase.presentation)}`;
}

export function buildIndicatorsData(
  filters: Pick<IndicatorsFilters, "inicio" | "fim" | "setor">,
  purchases: readonly IndicatorPurchase[],
  fairExpenses: readonly IndicatorFairExpense[],
): IndicatorsData {
  const months = monthList(filters.inicio, filters.fim);
  const allPeriodPurchases = purchases.filter(
    (purchase) =>
      purchase.orderDate.slice(0, 7) >= filters.inicio &&
      purchase.orderDate.slice(0, 7) <= filters.fim,
  );
  const periodFair = fairExpenses.filter((expense) => {
    const month = expense.competence.slice(0, 7);
    return month >= filters.inicio && month <= filters.fim;
  });

  const byMonth = new Map(
    months.map((month) => [
      month,
      {
        pharmacyCents: BigInt(0),
        laboratoryCents: BigInt(0),
        fairCents: BigInt(0),
        hasRecords: false,
        hasPharmacyRecords: false,
        hasLaboratoryRecords: false,
        hasFairRecords: false,
      },
    ]),
  );
  for (const purchase of allPeriodPurchases) {
    const month = byMonth.get(purchase.orderDate.slice(0, 7));
    if (!month) continue;
    const total = toCents(purchase.lineTotal);
    if (purchase.sector === "farmacia") {
      month.pharmacyCents += total;
      month.hasPharmacyRecords = true;
    } else {
      month.laboratoryCents += total;
      month.hasLaboratoryRecords = true;
    }
    month.hasRecords = true;
  }
  for (const expense of periodFair) {
    const month = byMonth.get(expense.competence.slice(0, 7));
    if (!month) continue;
    month.fairCents += toCents(expense.totalAmount);
    month.hasRecords = true;
    month.hasFairRecords = true;
  }

  const monthly = months.map((month) => {
    const values = byMonth.get(month)!;
    return {
      month,
      ...values,
      totalCents:
        values.pharmacyCents + values.laboratoryCents + values.fairCents,
    };
  });
  const pharmacyCents = monthly.reduce(
    (total, month) => total + month.pharmacyCents,
    BigInt(0),
  );
  const laboratoryCents = monthly.reduce(
    (total, month) => total + month.laboratoryCents,
    BigInt(0),
  );
  const fairCents = monthly.reduce(
    (total, month) => total + month.fairCents,
    BigInt(0),
  );
  return {
    pharmacyCents,
    laboratoryCents,
    fairCents,
    totalCents: pharmacyCents + laboratoryCents + fairCents,
    monthly,
    purchases: allPeriodPurchases.filter(
      (purchase) =>
        filters.setor === "todos" || purchase.sector === filters.setor,
    ),
    fairExpenses: periodFair,
    pharmacyItemCount: allPeriodPurchases.filter(
      (item) => item.sector === "farmacia",
    ).length,
    laboratoryItemCount: allPeriodPurchases.filter(
      (item) => item.sector === "laboratorio",
    ).length,
  };
}

export function buildPriceGroups(
  purchases: readonly IndicatorPurchase[],
): PriceGroup[] {
  const groups = new Map<string, IndicatorPurchase[]>();
  for (const purchase of purchases) {
    const key = getPriceGroupKey(purchase);
    const observations = groups.get(key);
    if (observations) observations.push(purchase);
    else groups.set(key, [purchase]);
  }

  return [...groups].map(([key, observations]) => {
    const ordered = [...observations].sort(
      (a, b) =>
        a.orderDate.localeCompare(b.orderDate) || a.id.localeCompare(b.id),
    );
    let lowest = toCents(ordered[0].unitPrice);
    let highest = lowest;
    for (const observation of ordered.slice(1)) {
      const price = toCents(observation.unitPrice);
      if (price < lowest) lowest = price;
      if (price > highest) highest = price;
    }
    const bestSupplierNames = [
      ...new Map(
        ordered
          .filter((item) => toCents(item.unitPrice) === lowest)
          .map((item) => [item.supplierId, item.supplierName]),
      ).values(),
    ].sort();
    const suppliers = new Map(
      ordered.map((item) => [item.supplierId, item.supplierName]),
    );
    return {
      key,
      sector: ordered[0].sector,
      productId: ordered[0].productId,
      name: ordered[ordered.length - 1].productName,
      presentation: ordered[ordered.length - 1].presentation,
      category: ordered[ordered.length - 1].category,
      suppliers: [...suppliers]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      lowestUnitPriceCents: lowest,
      bestSupplierNames,
      highestUnitPriceCents: highest,
      rangeCents: highest - lowest,
      observations: ordered,
    };
  });
}

export function compareConsecutivePrices(
  purchases: readonly IndicatorPurchase[],
): PriceChange[] {
  const changes: PriceChange[] = [];
  for (const group of buildPriceGroups(purchases)) {
    const byOrderDate = new Map<string, IndicatorPurchase[]>();
    for (const observation of group.observations) {
      const sameDate = byOrderDate.get(observation.orderDate);
      if (sameDate) sameDate.push(observation);
      else byOrderDate.set(observation.orderDate, [observation]);
    }

    const dates = [...byOrderDate.keys()].sort();
    for (let index = 1; index < dates.length; index += 1) {
      const previousOnDate = byOrderDate.get(dates[index - 1])!;
      const currentOnDate = byOrderDate.get(dates[index])!;

      // order_date has day precision; multiple observations that day have no
      // known order. Skip transitions touching that date instead of using IDs.
      if (previousOnDate.length !== 1 || currentOnDate.length !== 1) continue;

      const previous = previousOnDate[0];
      const current = currentOnDate[0];
      const previousCents = toCents(previous.unitPrice);
      const currentCents = toCents(current.unitPrice);
      const differenceCents = currentCents - previousCents;
      const percentageBasisPoints =
        previousCents === BigInt(0)
          ? null
          : (differenceCents * BigInt(10000) +
              (differenceCents >= BigInt(0)
                ? previousCents / BigInt(2)
                : -previousCents / BigInt(2))) /
            previousCents;
      changes.push({
        previous,
        current,
        differenceCents,
        percentageBasisPoints,
      });
    }
  }
  return changes;
}

export function getLargestIncreases(
  purchases: readonly IndicatorPurchase[],
  limit = 10,
): PriceChange[] {
  return compareConsecutivePrices(purchases)
    .filter((change) => change.differenceCents > BigInt(0))
    .sort((a, b) => {
      if (a.differenceCents !== b.differenceCents) {
        return a.differenceCents > b.differenceCents ? -1 : 1;
      }
      const aPercentage = a.percentageBasisPoints ?? -BigInt(1);
      const bPercentage = b.percentageBasisPoints ?? -BigInt(1);
      if (aPercentage !== bPercentage)
        return aPercentage > bPercentage ? -1 : 1;
      return a.current.id.localeCompare(b.current.id);
    })
    .slice(0, limit);
}

export function calculateSavingsOpportunities(
  purchases: readonly IndicatorPurchase[],
): SavingsOpportunity[] {
  return buildPriceGroups(purchases)
    .filter((group) => group.suppliers.length >= 2)
    .map((group) => {
      const benchmarkSpendCents = group.observations.reduce(
        (total, item) =>
          total +
          calculateLineTotalCents(
            item.quantity,
            `${group.lowestUnitPriceCents / BigInt(100)}.${(group.lowestUnitPriceCents % BigInt(100)).toString().padStart(2, "0")}`,
          ),
        BigInt(0),
      );
      const realSpendCents = group.observations.reduce(
        (total, item) => total + toCents(item.lineTotal),
        BigInt(0),
      );
      const potentialSavingsCents = group.observations.reduce((total, item) => {
        const actual = toCents(item.lineTotal);
        const benchmark = calculateLineTotalCents(
          item.quantity,
          `${group.lowestUnitPriceCents / BigInt(100)}.${(group.lowestUnitPriceCents % BigInt(100)).toString().padStart(2, "0")}`,
        );
        return total + (actual > benchmark ? actual - benchmark : BigInt(0));
      }, BigInt(0));
      return {
        key: group.key,
        sector: group.sector,
        name: group.name,
        presentation: group.presentation,
        realSpendCents,
        benchmarkSpendCents,
        potentialSavingsCents,
        suppliers: group.suppliers.length,
      };
    })
    .filter((item) => item.potentialSavingsCents > BigInt(0))
    .sort((a, b) =>
      a.potentialSavingsCents === b.potentialSavingsCents
        ? a.name.localeCompare(b.name, "pt-BR")
        : a.potentialSavingsCents > b.potentialSavingsCents
          ? -1
          : 1,
    );
}

export function topSavingsOpportunities(
  purchases: readonly IndicatorPurchase[],
  limit = 10,
): SavingsOpportunity[] {
  return calculateSavingsOpportunities(purchases).slice(0, limit);
}

export function getHistoricalPriceHistory(
  purchases: readonly IndicatorPurchase[],
  productId: string,
): IndicatorPurchase[] {
  return purchases
    .filter((purchase) => purchase.productId === productId)
    .sort(
      (a, b) =>
        b.orderDate.localeCompare(a.orderDate) || b.id.localeCompare(a.id),
    );
}

export function toMoneyCents(value: string): bigint {
  return toCents(value);
}
