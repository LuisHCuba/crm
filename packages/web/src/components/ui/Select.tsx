import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";

export type SelectOption = { value: string; label: string };

export type SelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

const CLEAR_VALUE = "__clear__";

export function Select({
  options,
  value,
  onChange,
  placeholder = "Selecione…",
  label,
  disabled,
  className,
  id,
}: SelectProps) {
  const safeOptions = options.filter(
    (opt) => typeof opt.value === "string" && opt.value.length > 0,
  );

  const handleChange = (v: string) => {
    const next = v ?? "";
    if (next === CLEAR_VALUE) {
      onChange("");
    } else {
      onChange(next);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-[var(--color-text)]"
        >
          {label}
        </label>
      ) : null}
      <SelectPrimitive.Root
        value={value || CLEAR_VALUE}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={id}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-left text-sm text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-[var(--color-muted)]",
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder}>
            {value
              ? safeOptions.find((o) => o.value === value)?.label ?? value
              : placeholder}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon>
            <ChevronDown className="size-4 shrink-0 text-[var(--color-muted)]" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-[9999] max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md"
          >
            <SelectPrimitive.ScrollUpButton className="flex h-8 cursor-default items-center justify-center text-[var(--color-muted)]">
              <ChevronUp className="size-4" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="p-1">
              <SelectPrimitive.Item
                value={CLEAR_VALUE}
                className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm text-[var(--color-muted)] outline-none data-[highlighted]:bg-[var(--color-accent-soft)]"
              >
                <span className="absolute left-2 flex size-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="size-4 text-[var(--color-accent)]" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{placeholder}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
              {safeOptions.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm text-[var(--color-text)] outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-[var(--color-accent-soft)] data-[disabled]:opacity-50"
                >
                  <span className="absolute left-2 flex size-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="size-4 text-[var(--color-accent)]" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex h-8 cursor-default items-center justify-center text-[var(--color-muted)]">
              <ChevronDown className="size-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
