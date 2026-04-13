import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        {...(loading
          ? ({ "aria-busy": true, "aria-disabled": true } as const)
          : {})}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-[var(--color-accent)] text-white hover:opacity-90",
          variant === "secondary" &&
            "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]",
          variant === "danger" &&
            "bg-[var(--color-red)] text-white hover:opacity-90",
          variant === "ghost" &&
            "bg-transparent text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]",
          size === "sm" && "h-8 px-3 text-sm",
          size === "md" && "h-10 px-4 text-sm",
          size === "lg" && "h-11 px-5 text-base",
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
