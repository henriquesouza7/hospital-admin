"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MonthYearPicker } from "@/components/ui/month-year-picker";

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
  const [period, setPeriod] = useState(
    `${initialYear}-${String(initialMonth).padStart(2, "0")}`,
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function selectPeriod(nextPeriod: string) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(nextPeriod);
    if (!match) return;
    setPeriod(nextPeriod);
    const query = new URLSearchParams({
      month: String(Number(match[2])),
      year: match[1],
    });
    if (searchQuery) query.set("q", searchQuery);
    if (category !== "all") query.set("category", category);
    startTransition(() =>
      router.replace(`/?${query.toString()}`, { scroll: false }),
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2 min-[861px]:w-auto">
      <MonthYearPicker
        value={period}
        min="1900-01"
        max="2100-12"
        aria-label="Período dos indicadores"
        onChange={(event) => selectPeriod(event.currentTarget.value)}
        className="w-[12.5rem] max-w-[calc(100vw-8.5rem)] flex-none"
      />
      {isPending ? (
        <span role="status" className="text-xs text-muted-foreground">
          Atualizando…
        </span>
      ) : null}
    </div>
  );
}
