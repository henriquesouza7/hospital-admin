"use client";

import { Popover } from "@base-ui/react/popover";
import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { SelectField } from "@/components/ui/select";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

function formatMonth(month: number) {
  const name = monthFormatter.format(new Date(Date.UTC(2020, month - 1, 1)));
  return `${name.charAt(0).toLocaleUpperCase("pt-BR")}${name.slice(1)}`;
}

export function DashboardPeriodFilter({
  initialMonth,
  initialYear,
  searchQuery = "",
  category = "all",
}: Readonly<{
  initialMonth: number;
  initialYear: number;
  searchQuery?: string;
  category?: string;
}>) {
  const generatedId = useId().replaceAll(":", "");
  const monthId = `dashboard-period-month-${generatedId}`;
  const yearId = `dashboard-period-year-${generatedId}`;
  const titleId = `dashboard-period-title-${generatedId}`;
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(String(initialYear));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function selectPeriod(nextMonth: number, nextYear: string) {
    const parsedYear = Number(nextYear);
    if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2100)
      return;
    setMonth(nextMonth);
    setYear(nextYear);
    const query = new URLSearchParams({
      month: String(nextMonth),
      year: nextYear,
    });
    if (searchQuery) query.set("q", searchQuery);
    if (category !== "all") query.set("category", category);
    startTransition(() =>
      router.replace(`/?${query.toString()}`, { scroll: false }),
    );
  }

  return (
    <div
      className="flex w-full min-w-0 items-center gap-2 min-[861px]:w-auto"
      aria-label="Filtrar indicadores por período"
    >
      <Popover.Root>
        <Popover.Trigger
          type="button"
          aria-label={`Período: ${formatMonth(month)} de ${year}. Alterar período`}
          className="group/period inline-flex h-11 w-[11.75rem] max-w-[calc(100vw-8.5rem)] flex-none items-center rounded-xl border border-input bg-background px-3.5 text-left text-sm font-medium text-foreground shadow-xs outline-none transition-[background-color,border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-muted/40 motion-reduce:transition-none"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <CalendarDays
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="truncate">
              {formatMonth(month)} de {year}
            </span>
          </span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            align="end"
            sideOffset={8}
            className="z-[100] max-w-[calc(100vw-1rem)]"
          >
            <Popover.Popup
              aria-labelledby={titleId}
              className="w-[min(22rem,calc(100vw-2rem))] origin-[var(--transform-origin)] rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl outline-none transition-[opacity,translate,scale] duration-[var(--motion-menu)] ease-[var(--motion-ease)] data-[starting-style]:translate-y-1 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:translate-y-1 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 motion-reduce:translate-none motion-reduce:scale-100 motion-reduce:transition-none"
            >
              <h2 id={titleId} className="text-sm font-semibold">
                Escolher período
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Selecione o mês e o ano para consultar.
              </p>
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_7.5rem] items-end gap-3">
                <div className="grid min-w-0 gap-1.5">
                  <label
                    htmlFor={monthId}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Mês
                  </label>
                  <SelectField
                    id={monthId}
                    value={month}
                    aria-label="Mês"
                    onChange={(event) =>
                      selectPeriod(Number(event.currentTarget.value), year)
                    }
                    className="h-11 min-h-11"
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(
                      (value) => (
                        <option key={value} value={value}>
                          {formatMonth(value)}
                        </option>
                      ),
                    )}
                  </SelectField>
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label
                    htmlFor={yearId}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Ano
                  </label>
                  <input
                    id={yearId}
                    type="number"
                    min="1900"
                    max="2100"
                    required
                    value={year}
                    onChange={(event) => setYear(event.currentTarget.value)}
                    onBlur={(event) => {
                      if (
                        event.currentTarget.validity.valid &&
                        event.currentTarget.value !== String(initialYear)
                      ) {
                        selectPeriod(month, event.currentTarget.value);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    className="h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm font-medium tabular-nums text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-[var(--motion-fast)] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
                  />
                </div>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {isPending ? (
        <span role="status" className="text-xs text-muted-foreground">
          Atualizando…
        </span>
      ) : null}
    </div>
  );
}
