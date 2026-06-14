import { cn } from "@/lib/cn";

type Stage = { id: string; name: string; type: string };

type PipelineTrackerProps = {
  stages: Stage[];
  currentStageId: string;
  className?: string;
};

export function PipelineTracker({
  stages,
  currentStageId,
  className,
}: PipelineTrackerProps) {
  const currentIdx = stages.findIndex((s) => s.id === currentStageId);
  const currentType = stages[currentIdx]?.type;

  const colorForStage = (idx: number, type: string) => {
    if (idx > currentIdx)
      return "bg-[color-mix(in_srgb,var(--color-muted)_22%,transparent)]";
    if (type === "won" || currentType === "won")
      return "bg-[var(--color-success)]";
    if (type === "lost" || currentType === "lost")
      return "bg-[var(--color-danger)]";
    return "bg-[var(--color-accent)]";
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex gap-0.5">
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            className={cn(
              "h-1.5 flex-1 rounded-[var(--radius-full)] transition-colors",
              colorForStage(idx, stage.type),
            )}
            title={stage.name}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-[var(--color-text)]">
        {stages[currentIdx]?.name ?? "—"}
      </span>
    </div>
  );
}
