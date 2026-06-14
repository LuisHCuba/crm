import { forwardRef, useId } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  label?: string;
  error?: string;
  variant?: "default" | "search";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, id, variant = "default", disabled, ...props },
    ref,
  ) => {
    const genId = useId();
    const inputId =
      id ?? (typeof props.name === "string" ? props.name : undefined) ?? genId;

    return (
      <div className={cn("w-full", className)}>
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[var(--color-text)]"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          {variant === "search" ? (
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]"
              aria-hidden
            />
          ) : null}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              "h-10 w-full rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--color-faint)] outline-none focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-ring)_35%,transparent)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-2)] disabled:opacity-60",
              variant === "search" && "pl-9",
              error &&
                "border-[var(--color-danger)] focus-visible:border-[var(--color-danger)] focus-visible:ring-[color-mix(in_srgb,var(--color-danger)_30%,transparent)]",
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={
              error ? `${inputId ?? "input"}-error` : undefined
            }
            {...props}
          />
        </div>
        {error ? (
          <p
            id={`${inputId ?? "input"}-error`}
            className="mt-1.5 text-sm text-[var(--color-red)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
