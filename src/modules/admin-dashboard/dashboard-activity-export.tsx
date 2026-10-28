"use client";

import { useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const subscribeToHydration = () => () => {};

type ExportRow = Readonly<{
  area: string;
  title: string;
  detail: string;
  period: string;
  quantity: string;
  status: string;
}>;

function csvCell(value: string) {
  const safeValue = /^\s*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function DashboardActivityExport({
  rows,
  period,
}: Readonly<{ rows: readonly ExportRow[]; period: string }>) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  function download() {
    const columns = [
      "Área",
      "Registro",
      "Detalhe",
      "Período",
      "Quantidade",
      "Situação",
    ];
    const content = [
      columns.map(csvCell).join(";"),
      ...rows.map((row) =>
        [row.area, row.title, row.detail, row.period, row.quantity, row.status]
          .map(csvCell)
          .join(";"),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hospital-admin-registros-${period}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!isHydrated || rows.length === 0}
      onClick={download}
      className="h-9 gap-2 rounded-[var(--radius-control)] bg-card px-3 text-sm"
    >
      <Download aria-hidden="true" className="size-4" />
      Exportar CSV
    </Button>
  );
}
