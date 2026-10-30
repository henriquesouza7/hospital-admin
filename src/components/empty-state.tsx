import type { LucideIcon } from "lucide-react";

type EmptyStateProps = Readonly<{
  title: string;
  description: string;
  icon: LucideIcon;
  density?: "comfortable" | "compact";
}>;

export function EmptyState({
  title,
  description,
  icon: Icon,
  density = "comfortable",
}: EmptyStateProps) {
  const compact = density === "compact";
  return (
    <div
      className={`flex flex-col items-center justify-center border border-dashed bg-card text-center ${compact ? "min-h-32 rounded-[var(--radius-analytics-card)] px-5 py-6" : "min-h-48 rounded-[var(--radius-dashboard-card)] px-6 py-10"}`}
    >
      <span
        className={`flex items-center justify-center bg-blue-50 text-primary ${compact ? "size-9 rounded-[10px]" : "size-11 rounded-xl"}`}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h2
        className={`${compact ? "mt-3" : "mt-4"} text-base font-semibold tracking-tight text-foreground`}
      >
        {title}
      </h2>
      <p
        className={`mt-1 max-w-md text-sm text-muted-foreground ${compact ? "leading-5" : "leading-6"}`}
      >
        {description}
      </p>
    </div>
  );
}
