export function formatCurrency(value: string | bigint): string {
  const cents =
    typeof value === "bigint"
      ? value
      : (() => {
          const [whole, fraction = ""] = value.split(".");
          return (
            BigInt(whole) * BigInt(100) +
            BigInt(fraction.padEnd(2, "0").slice(0, 2))
          );
        })();
  const negative = cents < BigInt(0);
  const absolute = negative ? -cents : cents;
  const whole = new Intl.NumberFormat("pt-BR").format(absolute / BigInt(100));
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");
  return `${negative ? "−" : ""}R$ ${whole},${fraction}`;
}

export function formatCompactCurrency(amountCents: bigint): string {
  const negative = amountCents < BigInt(0);
  const absolute = negative ? -amountCents : amountCents;
  const scales = [
    { cents: BigInt("100000"), suffix: "mil" },
    { cents: BigInt("100000000"), suffix: "mi" },
    { cents: BigInt("100000000000"), suffix: "bi" },
    { cents: BigInt("100000000000000"), suffix: "tri" },
  ];
  const scale = [...scales].reverse().find((item) => absolute >= item.cents);

  if (!scale) return formatCurrency(amountCents);

  const tenths =
    (absolute * BigInt(10) + scale.cents / BigInt(2)) / scale.cents;
  const whole = new Intl.NumberFormat("pt-BR").format(tenths / BigInt(10));
  const fraction = (tenths % BigInt(10)).toString();
  return `${negative ? "−" : ""}R$ ${whole},${fraction} ${scale.suffix}`;
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function getLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
