import type { LucideIcon } from "lucide-react";

type KpiCardProps = Readonly<{
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}>;

export function KpiCard({ label, value, detail, icon: Icon }: KpiCardProps) {
  return (
    <article className="min-w-0 rounded-[var(--radius-analytics-card)] border border-border bg-card p-4 shadow-[var(--shadow-analytics-card)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium leading-5 text-muted-foreground">
          {label}
        </p>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-accent-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-4 break-words text-[clamp(1.625rem,2.6vw,2rem)] font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
        {detail}
      </p>
    </article>
  );
}
