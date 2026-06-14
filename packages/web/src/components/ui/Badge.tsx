import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "accent";
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        variant === "success" &&
          "bg-[var(--color-success-soft)] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_25%,transparent)]",
        variant === "warning" &&
          "bg-[var(--color-warning-soft)] text-[var(--color-warning)] ring-[color-mix(in_srgb,var(--color-warning)_25%,transparent)]",
        variant === "danger" &&
          "bg-[var(--color-danger-soft)] text-[var(--color-danger)] ring-[color-mix(in_srgb,var(--color-danger)_25%,transparent)]",
        variant === "info" &&
          "bg-[var(--color-info-soft)] text-[var(--color-info)] ring-[color-mix(in_srgb,var(--color-info)_25%,transparent)]",
        variant === "accent" &&
          "bg-[var(--color-accent-soft)] text-[var(--color-accent)] ring-[color-mix(in_srgb,var(--color-accent)_25%,transparent)]",
        variant === "neutral" &&
          "bg-[color-mix(in_srgb,var(--color-muted)_12%,transparent)] text-[var(--color-muted)] ring-[color-mix(in_srgb,var(--color-muted)_20%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}
