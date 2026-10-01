import type { LucideIcon } from "lucide-react";

type KpiCardProps = Readonly<{
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}>;

export function KpiCard({ label, value, detail, icon: Icon }: KpiCardProps) {
  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm shadow-slate-200/50 transition-shadow hover:shadow-md hover:shadow-slate-200/60">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}
