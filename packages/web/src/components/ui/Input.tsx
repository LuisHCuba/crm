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
              "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50",
              variant === "search" && "pl-9",
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
