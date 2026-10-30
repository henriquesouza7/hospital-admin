"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";
import {
  Children,
  isValidElement,
  type ChangeEventHandler,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "\u0000empty-select-value";

const displayLabels: Record<string, string> = {
  financeiro: "Financeiro",
  internacoes: "Internações",
  producao: "Produção",
  "pequenas-cirurgias": "Pequenas Cirurgias",
};

type OptionElement = ReactElement<{
  children?: ReactNode;
  value?: string | number;
  disabled?: boolean;
  hidden?: boolean;
}>;

type SelectOption = {
  value: string;
  label: ReactNode;
  disabled: boolean;
};

type SelectFieldProps = Omit<
  ComponentProps<typeof SelectPrimitive.Trigger>,
  "children" | "className" | "disabled" | "id"
> & {
  children: ReactNode;
  autoComplete?: string;
  className?: string;
  defaultValue?: string | number;
  disabled?: boolean;
  form?: string;
  id?: string;
  name?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  required?: boolean;
  variant?: "default" | "pill";
  value?: string | number;
};

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textContent).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textContent(node.props.children);
  }

  return "";
}

function collectOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];

    if (child.type === "optgroup") {
      return collectOptions(
        (child as ReactElement<{ children?: ReactNode }>).props.children,
      );
    }

    if (child.type !== "option") return [];

    const option = child as OptionElement;
    if (option.props.hidden) return [];

    const rawValue = option.props.value ?? textContent(option.props.children);
    const value = String(rawValue);
    const rawLabel = textContent(option.props.children);
    const normalizedValue = value.toLocaleLowerCase("pt-BR");
    const label =
      rawLabel.trim().toLocaleLowerCase("pt-BR") === normalizedValue
        ? (displayLabels[normalizedValue] ?? rawLabel)
        : rawLabel;

    return [
      {
        value: value === "" ? EMPTY_VALUE : value,
        label,
        disabled: Boolean(option.props.disabled),
      },
    ];
  });
}

function SelectField({
  children,
  className,
  defaultValue,
  disabled,
  autoComplete,
  form,
  id,
  name,
  onChange,
  required,
  variant = "default",
  value,
  ...triggerProps
}: SelectFieldProps) {
  const options = collectOptions(children);
  const selectedValue = value ?? defaultValue ?? options[0]?.value;
  const normalizedValue =
    selectedValue === undefined
      ? undefined
      : String(selectedValue) === ""
        ? EMPTY_VALUE
        : String(selectedValue);

  function handleValueChange(nextValue: string | null) {
    if (!onChange) return;

    const next =
      nextValue === EMPTY_VALUE || nextValue === null ? "" : nextValue;
    const target = { name: name ?? "", value: next };
    onChange({
      target,
      currentTarget: target,
      preventDefault() {},
      stopPropagation() {},
    } as Parameters<ChangeEventHandler<HTMLSelectElement>>[0]);
  }

  return (
    <SelectPrimitive.Root
      items={options.map(({ value: optionValue, label }) => ({
        value: optionValue,
        label,
      }))}
      value={value === undefined ? undefined : normalizedValue}
      defaultValue={value === undefined ? normalizedValue : undefined}
      onValueChange={handleValueChange}
      itemToStringValue={(optionValue) =>
        optionValue === EMPTY_VALUE ? "" : String(optionValue)
      }
      name={name}
      form={form}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      id={id}
    >
      <SelectPrimitive.Trigger
        {...triggerProps}
        id={id}
        className={cn(
          "group/select flex w-full min-w-0 items-center justify-between gap-3 text-left text-foreground outline-none transition-[color,background-color,border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--motion-ease)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          variant === "pill"
            ? "min-h-9 rounded-full border-0 bg-transparent px-3 text-sm font-medium shadow-none hover:bg-muted/50"
            : "min-h-10 rounded-xl border border-input bg-background px-3.5 pr-3.5 text-sm font-normal shadow-xs hover:bg-muted/40",
          className,
        )}
      >
        <SelectPrimitive.Value className="min-w-0 flex-1 truncate" />
        <SelectPrimitive.Icon className="shrink-0 text-muted-foreground transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-data-[popup-open]/select:rotate-180 motion-reduce:transition-none">
          <ChevronDown aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          align="start"
          alignItemWithTrigger={false}
          sideOffset={5}
          className="z-[100] max-w-[calc(100vw-1rem)]"
        >
          <SelectPrimitive.Popup className="min-w-[var(--anchor-width)] max-w-[calc(100vw-1rem)] origin-[var(--transform-origin)] overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none transition-[opacity,translate,scale] duration-[var(--motion-menu)] ease-[var(--motion-ease)] data-[starting-style]:translate-y-1 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:translate-y-1 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 motion-reduce:translate-none motion-reduce:scale-100 motion-reduce:transition-none">
            <SelectPrimitive.List className="max-h-[min(20rem,var(--available-height))] overflow-y-auto">
              {options.map((option, index) => (
                <SelectPrimitive.Item
                  key={`${option.value}-${index}`}
                  value={option.value}
                  disabled={option.disabled}
                  className="grid min-h-9 cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[selected]:font-medium data-[disabled]:pointer-events-none data-[disabled]:opacity-45 motion-reduce:transition-none"
                >
                  <SelectPrimitive.ItemIndicator className="col-start-1">
                    <Check aria-hidden="true" className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText className="col-start-2 min-w-0 whitespace-normal break-words">
                    {option.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { SelectField };
