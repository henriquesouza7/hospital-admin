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
    <section className="min-w-0 rounded-[var(--radius-analytics-card)] border border-border bg-card p-4 shadow-[var(--shadow-analytics-card)] sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="mt-2 self-start rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:mt-0">
          {badge}
        </span>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
