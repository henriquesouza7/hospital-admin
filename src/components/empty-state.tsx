import type { LucideIcon } from "lucide-react";

type EmptyStateProps = Readonly<{
  title: string;
  description: string;
  icon: LucideIcon;
}>;

export function EmptyState({
  title,
  description,
  icon: Icon,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-[var(--radius-dashboard-card)] border border-dashed bg-card px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
