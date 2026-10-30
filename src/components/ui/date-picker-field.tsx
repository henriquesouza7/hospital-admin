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

const today = () =>
  new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });

const monthLabel = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function formatDate(value: string) {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeZone: "UTC",
      }).format(date)
    : "Selecione a data";
}

type DatePickerFieldProps = Readonly<{
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

export function DatePickerField({
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
}: DatePickerFieldProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selected = value ?? internalValue;
  const currentDate = today();
  const selectedDate = parseDate(selected);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const date = selectedDate ?? parseDate(currentDate)!;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  });
  const [open, setOpen] = useState(false);
  const year = displayMonth.getUTCFullYear();
  const month = displayMonth.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstAllowed = min ? min.slice(0, 7) : "0000-00";
  const lastAllowed = max ? max.slice(0, 7) : "9999-99";
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const canGoPrevious =
    `${year}-${String(month).padStart(2, "0")}` >= firstAllowed;
  const canGoNext =
    `${year}-${String(month + 2).padStart(2, "0")}` <= lastAllowed;

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

  function moveFocus(index: number, step: number) {
    const next = index + step;
    if (next >= 0 && next < daysInMonth) dayRefs.current[next]?.focus();
  }

  function shiftMonth(amount: number) {
    setDisplayMonth(new Date(Date.UTC(year, month + amount, 1)));
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const date = parseDate(selected) ?? parseDate(currentDate)!;
          setDisplayMonth(
            new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
          );
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-required={required}
        className={cn(
          "group/date inline-flex min-h-10 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/10 px-3.5 text-left text-sm font-normal text-foreground shadow-sm outline-none transition-[background-color,border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:border-ring hover:bg-primary/15 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:border-ring aria-expanded:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
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
          {formatDate(selected)}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-link transition-transform group-aria-expanded/date:rotate-180"
        />
      </Popover.Trigger>
      <input
        type="date"
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
            className="w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl outline-none"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <p id={titleId} className="text-sm font-semibold">
                  Escolher data
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {monthLabel.format(displayMonth)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  disabled={!canGoPrevious}
                  onClick={() => shiftMonth(-1)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  disabled={!canGoNext}
                  onClick={() => shiftMonth(1)}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
            <div
              role="grid"
              aria-label={monthLabel.format(displayMonth)}
              className="mt-3"
            >
              <div
                role="row"
                className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground"
              >
                {weekDays.map((day) => (
                  <span role="columnheader" key={day} className="py-2">
                    {day}
                  </span>
                ))}
              </div>
              {Array.from(
                { length: Math.ceil((offset + daysInMonth) / 7) },
                (_, row) => (
                  <div role="row" key={row} className="grid grid-cols-7">
                    {Array.from({ length: 7 }, (_, column) => {
                      const day = row * 7 + column - offset + 1;
                      if (day < 1 || day > daysInMonth)
                        return (
                          <span
                            role="gridcell"
                            aria-hidden="true"
                            key={column}
                          />
                        );
                      const candidate = `${monthKey}-${String(day).padStart(2, "0")}`;
                      const active = candidate === selected;
                      const isToday = candidate === currentDate;
                      const index = day - 1;
                      return (
                        <span role="gridcell" key={column}>
                          <button
                            ref={(node) => {
                              dayRefs.current[index] = node;
                            }}
                            type="button"
                            disabled={Boolean(
                              (min && candidate < min) ||
                              (max && candidate > max),
                            )}
                            aria-pressed={active}
                            aria-label={`${day} de ${monthLabel.format(displayMonth)}${isToday ? ", hoje" : ""}`}
                            onClick={() => choose(candidate)}
                            onKeyDown={(event) => {
                              if (event.key === "ArrowRight") {
                                event.preventDefault();
                                moveFocus(index, 1);
                              }
                              if (event.key === "ArrowLeft") {
                                event.preventDefault();
                                moveFocus(index, -1);
                              }
                              if (event.key === "ArrowDown") {
                                event.preventDefault();
                                moveFocus(index, 7);
                              }
                              if (event.key === "ArrowUp") {
                                event.preventDefault();
                                moveFocus(index, -7);
                              }
                              if (event.key === "PageUp") {
                                event.preventDefault();
                                shiftMonth(-1);
                              }
                              if (event.key === "PageDown") {
                                event.preventDefault();
                                shiftMonth(1);
                              }
                            }}
                            className={cn(
                              "mx-auto grid size-9 place-items-center rounded-lg text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35",
                              active &&
                                "bg-primary font-semibold text-primary-foreground ring-1 ring-primary hover:bg-primary",
                              isToday && !active && "font-semibold text-link",
                            )}
                          >
                            {day}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ),
              )}
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
                  (min && currentDate < min) || (max && currentDate > max),
                )}
                onClick={() => choose(currentDate)}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              >
                Hoje
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
