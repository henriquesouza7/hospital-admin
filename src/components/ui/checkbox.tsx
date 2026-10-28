import type { ComponentProps } from "react";
import { cn } from "cn";

type CheckboxProps = Omit<ComponentProps<"input">, "type">;

function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn("ui-checkbox", className)}
      {...props}
    />
  );
}

export { Checkbox };
