"use client";

import { Popover } from "@base-ui/react/popover";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useId, useRef, useState, type ChangeEventHandler } from "react";
import { cn } from "@/lib/utils";

const months = Array.from({ length: 12 }, (_, index) => {
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(2020, index, 1)))
    .replace(".", "");
  return month.charAt(0).toLocaleUpperCase("pt-BR") + month.slice(1);
});
const today = () =>
  new Date()
    .toLocaleDateString("sv-SE", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
    })
    .slice(0, 7);

type MonthYearPickerProps = Readonly<{
  id?: string;
  name?: string;
  form?: string;
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}>;

function yearOf(value: string | undefined, fallback: number) {
  const year = Number(value?.slice(0, 4));
  return Number.isInteger(year) && year >= 1900 && year <= 2100
    ? year
    : fallback;
}

export function MonthYearPicker({
  id,
  name,
  form,
  value,
  defaultValue = "",
  min,
  max,
  required,
  disabled,
  className,
  onChange,
  "aria-label": ariaLabel,
}: MonthYearPickerProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const monthRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selected = value ?? internalValue;
  const currentMonth = today();
  const [displayYear, setDisplayYear] = useState(() =>
    yearOf(selected, yearOf(currentMonth, new Date().getFullYear())),
  );
  const [open, setOpen] = useState(false);
  const firstYear = yearOf(min, 1900);
  const lastYear = yearOf(max, 2100);
  const selectedMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(selected)
    ? Number(selected.slice(5))
    : null;

  function choose(next: string) {
    if (value === undefined) setInternalValue(next);
    if (onChange) {
      const target = { name: name ?? "", value: next };
      onChange({
        target,
        currentTarget: target,
        preventDefault() {},
        stopPropagation() {},
      } as Parameters<ChangeEventHandler<HTMLInputElement>>[0]);
    }
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleOpenChange(next: boolean) {
    if (next) setDisplayYear(yearOf(selected, yearOf(currentMonth, 2026)));
    setOpen(next);
  }

  function moveFocus(monthIndex: number, key: string) {
    const step =
      key === "ArrowRight"
        ? 1
        : key === "ArrowLeft"
          ? -1
          : key === "ArrowDown"
            ? 3
            : -3;
    const next = monthIndex + step;
    if (next >= 0 && next < 12) monthRefs.current[next]?.focus();
  }

  const display = selectedMonth
    ? `${months[selectedMonth - 1]} de ${selected.slice(0, 4)}`
    : "Selecione o mês";

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-required={required}
        className={cn(
          "group/month inline-flex min-h-10 w-full min-w-0 items-center gap-2.5 rounded-xl border border-border/80 bg-card px-3.5 text-left text-sm font-normal text-foreground shadow-sm outline-none transition-[background-color,border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
          className,
        )}
      >
        <CalendarDays
          aria-hidden="true"
          className="size-4 shrink-0 text-link"
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selected && "text-muted-foreground",
          )}
        >
          {display}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-aria-expanded/month:rotate-180 motion-reduce:transition-none"
        />
      </Popover.Trigger>
      <input
        type="month"
        name={name}
        form={form}
        value={selected}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onInvalid={(event) => {
          event.preventDefault();
          setOpen(true);
          triggerRef.current?.focus();
        }}
      />
      <Popover.Portal>
        <Popover.Positioner
          align="start"
          sideOffset={7}
          className="z-[100] max-w-[calc(100vw-1rem)]"
        >
          <Popover.Popup
            aria-labelledby={titleId}
            className="w-[min(21rem,calc(100vw-2rem))] origin-[var(--transform-origin)] rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl outline-none transition-[opacity,translate,scale] duration-[var(--motion-menu)] ease-[var(--motion-ease)] data-[starting-style]:translate-y-1 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:translate-y-1 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 motion-reduce:transition-none"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <p id={titleId} className="text-sm font-semibold">
                  Competência
                </p>
                <p className="text-xs text-muted-foreground">
                  Escolha o mês e o ano
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Ano anterior"
                  disabled={displayYear <= firstYear}
                  onClick={() => setDisplayYear(displayYear - 1)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </button>
                <span className="w-11 text-center text-sm font-semibold tabular-nums">
                  {displayYear}
                </span>
                <button
                  type="button"
                  aria-label="Próximo ano"
                  disabled={displayYear >= lastYear}
                  onClick={() => setDisplayYear(displayYear + 1)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
            <div
              className="mt-3 grid grid-cols-3 gap-1.5"
              role="group"
              aria-label={`Meses de ${displayYear}`}
            >
              {months.map((month, index) => {
                const candidate = `${displayYear}-${String(index + 1).padStart(2, "0")}`;
                const active = candidate === selected;
                const isCurrent = candidate === currentMonth;
                return (
                  <button
                    key={candidate}
                    ref={(node) => {
                      monthRefs.current[index] = node;
                    }}
                    type="button"
                    disabled={Boolean(
                      (min && candidate < min) || (max && candidate > max),
                    )}
                    aria-pressed={active}
                    aria-label={`${month} de ${displayYear}${isCurrent ? ", mês atual" : ""}`}
                    onClick={() => choose(candidate)}
                    onKeyDown={(event) => {
                      if (
                        [
                          "ArrowRight",
                          "ArrowLeft",
                          "ArrowDown",
                          "ArrowUp",
                        ].includes(event.key)
                      ) {
                        event.preventDefault();
                        moveFocus(index, event.key);
                      }
                    }}
                    className={cn(
                      "relative min-h-10 rounded-lg px-2 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none",
                      active &&
                        "bg-primary text-primary-foreground ring-1 ring-primary hover:bg-primary",
                      isCurrent && !active && "text-link",
                    )}
                  >
                    {month}
                    {isCurrent ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-1 mx-auto size-1 rounded-full bg-link"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
              <button
                type="button"
                disabled={required || !selected}
                onClick={() => choose("")}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              >
                Limpar
              </button>
              <button
                type="button"
                disabled={Boolean(
                  (min && currentMonth < min) || (max && currentMonth > max),
                )}
                onClick={() => choose(currentMonth)}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              >
                Este mês
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
