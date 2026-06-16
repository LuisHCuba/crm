import { type ReactNode } from "react";
import { ChevronDown, Plus, Search, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Abas de visões salvas (estilo HubSpot)                             */
/* ------------------------------------------------------------------ */

export interface ViewTab {
  id: string;
  label: string;
  count?: number | string | null;
  locked?: boolean;
}

export function ViewTabs({
  tabs,
  activeId,
  onSelect,
  onAdd,
}: {
  tabs: ViewTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4">
      <div className="flex items-end gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === activeId;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              {t.count != null && (
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                    active
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
          title="Nova visão"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Barra de ferramentas (busca + ações)                               */
/* ------------------------------------------------------------------ */

export function SearchBox({
  value,
  onChange,
  placeholder = "Pesquisar",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function ToolbarButton({
  icon,
  children,
  onClick,
  active,
  title,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Pílulas de filtro rápido                                           */
/* ------------------------------------------------------------------ */

/** Filtro funcional: select estilizado como pílula do HubSpot. */
export function FilterPill({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const active = value !== "";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`peer cursor-pointer appearance-none rounded-full border py-1.5 pl-3 pr-8 text-sm font-medium outline-none transition ${
          active
            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${
          active ? "text-indigo-600" : "text-slate-400"
        }`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Barra de seleção em massa                                          */
/* ------------------------------------------------------------------ */

export function SelectionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5">
      <span className="text-sm font-semibold text-indigo-700">
        {count} selecionado{count > 1 ? "s" : ""}
      </span>
      <div className="h-4 w-px bg-indigo-200" />
      <div className="flex items-center gap-2">{children}</div>
      <button
        onClick={onClear}
        className="ml-auto flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        <X size={14} /> Limpar
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Paginação                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  pageCount,
  perPage,
  perPageOptions = [25, 50, 100],
  onPageChange,
  onPerPageChange,
}: {
  page: number;
  pageCount: number;
  perPage: number;
  perPageOptions?: number[];
  onPageChange: (p: number) => void;
  onPerPageChange: (n: number) => void;
}) {
  const pages = pageWindow(page, pageCount);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 bg-white px-4 py-3">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
      >
        Voltar
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="px-1 text-sm text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-8 rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
              p === page
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
      >
        Próximo
      </button>
      <select
        value={perPage}
        onChange={(e) => onPerPageChange(Number(e.target.value))}
        className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-600 outline-none focus:border-indigo-500"
      >
        {perPageOptions.map((n) => (
          <option key={n} value={n}>
            {n} por página
          </option>
        ))}
      </select>
    </div>
  );
}

/** Gera a janela de páginas com reticências (1 … 4 5 6 … 20). */
function pageWindow(current: number, total: number): (number | "...")[] {
  if (total <= 7)
    return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("...");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("...");
  out.push(total);
  return out;
}
