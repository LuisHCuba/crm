import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "success";
  size?: "sm" | "md" | "lg" | "icon";
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
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-lg)] font-medium transition-[background-color,border-color,color,box-shadow,opacity] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)]",
          variant === "secondary" &&
            "border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]",
          variant === "outline" &&
            "border border-[var(--color-accent)] bg-transparent text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]",
          variant === "danger" &&
            "bg-[var(--color-danger)] text-white shadow-[var(--shadow-xs)] hover:brightness-110 active:brightness-95",
          variant === "success" &&
            "bg-[var(--color-success)] text-white shadow-[var(--shadow-xs)] hover:brightness-110 active:brightness-95",
          variant === "ghost" &&
            "bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]",
          size === "sm" && "h-8 px-3 text-sm",
          size === "md" && "h-10 px-4 text-sm",
          size === "lg" && "h-11 px-5 text-base",
          size === "icon" && "size-10 p-0",
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
