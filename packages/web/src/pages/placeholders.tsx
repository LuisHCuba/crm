import type { ComponentType, ReactNode } from "react";
import { Construction } from "lucide-react";

type PlaceholderPageProps = {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
};

/**
 * Tela genérica para rotas ainda em construção. Mantém a mesma hierarquia
 * (título de página + estado vazio) usada nas demais telas do CRM.
 */
export function PlaceholderPage({
  title,
  description = "Esta área ainda está em construção. Em breve, novidades por aqui.",
  icon: Icon = Construction,
  action,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl">
        {title}
      </h1>

      <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-16 text-center shadow-[var(--shadow-xs)]">
        <span
          className="flex size-12 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent-soft)]"
          aria-hidden
        >
          <Icon className="size-6 text-[var(--color-accent)]" />
        </span>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-[var(--color-text)]">
            Em construção
          </p>
          <p className="mx-auto max-w-md text-sm text-[var(--color-muted)]">
            {description}
          </p>
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}
