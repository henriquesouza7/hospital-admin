export const OPERATIONAL_TIME_ZONE = "America/Sao_Paulo";

type TimestampFormat = "date" | "dateTime";

export function formatOperationalTimestamp(
  value: string,
  format: TimestampFormat = "dateTime",
): string {
  const options: Intl.DateTimeFormatOptions =
    format === "date"
      ? { dateStyle: "short" }
      : { dateStyle: "short", timeStyle: "short" };

  return new Intl.DateTimeFormat("pt-BR", {
    ...options,
    timeZone: OPERATIONAL_TIME_ZONE,
  }).format(new Date(value));
}
