import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusBadgeProps = Readonly<{
  label: string;
  tone?: "neutral" | "info" | "success" | "warning";
  icon?: LucideIcon;
}>;

const toneClasses = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-primary/40 bg-accent text-accent-foreground",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
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
