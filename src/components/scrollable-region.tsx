import type { ReactNode } from "react";
import { cn } from "cn";

type ScrollableRegionProps = {
  "aria-label": string;
  children: ReactNode;
  className?: string;
};

export function ScrollableRegion({
  "aria-label": ariaLabel,
  children,
  className,
}: ScrollableRegionProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      role="region"
      tabIndex={0}
    >
      {children}
    </div>
  );
}
