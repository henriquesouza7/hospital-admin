import type { LucideIcon } from "lucide-react";

type KpiCardProps = Readonly<{
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}>;

export function KpiCard({ label, value, detail, icon: Icon }: KpiCardProps) {
  return (
    <article className="min-w-0 rounded-[var(--radius-dashboard-card)] border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-5 break-words text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-none tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-3 text-sm leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}
