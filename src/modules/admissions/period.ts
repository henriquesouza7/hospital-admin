export function saoPauloToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return new Date(
    Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)),
  );
}

export function addMonthsClamped(date: Date, months: number): Date {
  const targetMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(targetYear, normalizedMonth, Math.min(date.getUTCDate(), lastDay)),
  );
}

export function parseYearMonth(search: {
  year?: string | string[];
  month?: string | string[];
}): { year: number; month: number; today: Date } {
  const today = saoPauloToday();
  const yearValue = Array.isArray(search.year) ? search.year[0] : search.year;
  const monthValue = Array.isArray(search.month)
    ? search.month[0]
    : search.month;
  const parsedYear = Number(yearValue);
  const parsedMonth = Number(monthValue);
  const year =
    Number.isInteger(parsedYear) && parsedYear >= 1900 && parsedYear <= 2100
      ? parsedYear
      : today.getUTCFullYear();
  const month =
    Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : today.getUTCMonth() + 1;
  return { year, month, today };
}
