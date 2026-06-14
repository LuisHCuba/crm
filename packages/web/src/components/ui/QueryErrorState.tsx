import { AlertTriangle, RotateCw } from "lucide-react";

type QueryErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function QueryErrorState({
  message = "Erro ao carregar dados. Tente novamente.",
  onRetry,
}: QueryErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center">
      <span
        className="flex size-11 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-danger-soft)]"
        aria-hidden
      >
        <AlertTriangle className="size-5 text-[var(--color-danger)]" />
      </span>
      <p className="text-sm text-[var(--color-muted)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-contrast)] shadow-[var(--shadow-xs)] outline-none transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          <RotateCw className="size-4" aria-hidden />
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
