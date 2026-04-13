import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "success" &&
          "bg-[color-mix(in_srgb,var(--color-green)_18%,transparent)] text-[var(--color-green)]",
        variant === "warning" &&
          "bg-[color-mix(in_srgb,var(--color-yellow)_22%,transparent)] text-[var(--color-yellow)]",
        variant === "danger" &&
          "bg-[color-mix(in_srgb,var(--color-red)_18%,transparent)] text-[var(--color-red)]",
        variant === "info" &&
          "border border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
        variant === "neutral" &&
          "bg-[color-mix(in_srgb,var(--color-muted)_15%,transparent)] text-[var(--color-muted)]",
        className,
      )}
      {...props}
    />
  );
}
