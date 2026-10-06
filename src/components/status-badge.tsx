import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusBadgeProps = Readonly<{
  label: string;
  tone?: "neutral" | "info" | "success" | "warning" | "destructive";
  icon?: LucideIcon;
}>;

const toneClasses = {
  neutral:
    "border-status-neutral-border bg-status-neutral text-status-neutral-foreground",
  info: "border-status-info-border bg-status-info text-status-info-foreground",
  success:
    "border-status-success-border bg-status-success text-status-success-foreground",
  warning:
    "border-status-warning-border bg-status-warning text-status-warning-foreground",
  destructive:
    "border-status-error-border bg-status-error text-status-error-foreground",
} as const;

export function StatusBadge({
  label,
  tone = "neutral",
  icon: Icon,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
      {label}
    </span>
  );
}
