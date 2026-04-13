import { cn } from "@/lib/cn";

export type ProgressBarProps = {
  value: number;
  color?: "accent" | "green" | "red";
  className?: string;
};

export function ProgressBar({
  value,
  color = "accent",
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor =
    color === "green"
      ? "var(--color-green)"
      : color === "red"
        ? "var(--color-red)"
        : "var(--color-accent)";

  return (
    <div
      role="progressbar"
      aria-label="Progresso"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-muted)_20%,transparent)]",
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
