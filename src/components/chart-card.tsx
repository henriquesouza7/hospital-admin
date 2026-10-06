import type { ReactNode } from "react";

type ChartCardProps = Readonly<{
  title: string;
  description: string;
  children: ReactNode;
}>;

export function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
