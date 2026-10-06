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
  const whole = new Intl.NumberFormat("pt-BR").format(cents / BigInt(100));
  const fraction = (cents % BigInt(100)).toString().padStart(2, "0");
  return `R$ ${whole},${fraction}`;
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
