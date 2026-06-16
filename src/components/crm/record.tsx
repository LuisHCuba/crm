import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

/** Cabeçalho da record page, com botão de voltar e ações. */
export function RecordHeader({
  backTo,
  backLabel,
  avatar,
  title,
  subtitle,
  badge,
  actions,
}: {
  backTo: string;
  backLabel: string;
  avatar?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b border-slate-200 bg-white px-8 py-5">
      <Link
        to={backTo}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
      >
        <ChevronLeft size={16} /> {backLabel}
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatar}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Card de seção usado nas três colunas. */
export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Linha de propriedade (rótulo + valor) na coluna de detalhes. */
export function Property({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">
        {children || "—"}
      </span>
    </div>
  );
}
