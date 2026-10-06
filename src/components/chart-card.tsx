import type { ReactNode } from "react";

type ChartCardProps = Readonly<{
  title: string;
  description: string;
  children: ReactNode;
  badge?: string;
}>;

export function ChartCard({
  title,
  description,
  children,
  badge = "Demonstração",
}: ChartCardProps) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm shadow-slate-200/40 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="mt-2 self-start rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:mt-0">
          {badge}
        </span>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
