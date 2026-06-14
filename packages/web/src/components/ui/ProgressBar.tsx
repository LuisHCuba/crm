import { cn } from "@/lib/cn";

export type ProgressBarProps = {
  value: number;
  color?: "accent" | "green" | "red" | "warning" | "info";
  className?: string;
};

const BAR_COLORS: Record<NonNullable<ProgressBarProps["color"]>, string> = {
  accent: "var(--color-accent)",
  green: "var(--color-success)",
  red: "var(--color-danger)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
};

export function ProgressBar({
  value,
  color = "accent",
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = BAR_COLORS[color] ?? BAR_COLORS.accent;

  return (
    <div
      role="progressbar"
      aria-label="Progresso"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-[color-mix(in_srgb,var(--color-muted)_18%,transparent)]",
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  );
}
