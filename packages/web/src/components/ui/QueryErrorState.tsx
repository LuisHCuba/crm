type QueryErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function QueryErrorState({
  message = "Erro ao carregar dados. Tente novamente.",
  onRetry,
}: QueryErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="text-sm text-[var(--color-muted)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
