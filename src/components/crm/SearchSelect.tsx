import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { OverlayPortal } from "../chrome/OverlayPortal";
import { OVERLAY_Z_CLASS } from "../chrome/overlays";
import type { SearchOption } from "../../lib/entity-search";

/* ------------------------------------------------------------------ */
/*  SearchSelect — dropdown com busca no servidor                      */
/*                                                                     */
/*  Substitui <select> em seletores de registros (contatos, empresas,  */
/*  negócios, produtos...). A cada digitação, busca no Hasura com      */
/*  ilike + limite — nunca carrega a tabela inteira no navegador.      */
/*                                                                     */
/*  Uso controlado:   value + onChange                                 */
/*  Uso em <form>:    name + defaultValue (participa do FormData)      */
/* ------------------------------------------------------------------ */

export function SearchSelect({
  name,
  label,
  placeholder = "Selecionar...",
  searchPlaceholder = "Digite para buscar...",
  defaultValue = null,
  value,
  onChange,
  loadOptions,
  required,
  disabled,
  allowClear = true,
  defaultOpen = false,
}: {
  /** Nome do campo — gera input oculto com o id p/ forms (FormData). */
  name?: string;
  /** Rótulo acima do campo (opcional). */
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Seleção inicial (modo não controlado, típico em forms). */
  defaultValue?: SearchOption | null;
  /** Seleção controlada — se fornecido, o componente segue este valor. */
  value?: SearchOption | null;
  onChange?: (opt: SearchOption | null) => void;
  /** Busca opções no servidor. Query vazia deve retornar os recentes. */
  loadOptions: (q: string) => Promise<SearchOption[]>;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  /** Abre o painel de busca imediatamente (ex.: painéis de vínculo). */
  defaultOpen?: boolean;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<SearchOption | null>(defaultValue);
  const selected = controlled ? value : internal;

  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const requestSeq = useRef(0);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  // Busca (com debounce) sempre que abre ou a query muda.
  useEffect(() => {
    if (!open) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    const t = setTimeout(() => {
      loadOptions(query.trim())
        .then((opts) => {
          if (requestSeq.current === seq) {
            setOptions(opts);
            setActive(0);
          }
        })
        .catch(() => {
          if (requestSeq.current === seq) setOptions([]);
        })
        .finally(() => {
          if (requestSeq.current === seq) setLoading(false);
        });
    }, query ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  // Foco no campo de busca ao abrir.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Posiciona o painel no viewport (evita clip por overflow do shell/main).
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;

    const sync = () => {
      const rect = rootRef.current!.getBoundingClientRect();
      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 300,
      });
    };

    sync();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [open]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const select = (opt: SearchOption | null) => {
    if (!controlled) setInternal(opt);
    onChange?.(opt);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[active]) select(options[active]);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      {/* Campo visível (gatilho) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 ${
          selected ? "text-slate-900" : "text-slate-400"
        }`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? selected.label : placeholder}
        </span>
        {selected && allowClear && !disabled && (
          <span
            role="button"
            aria-label="Limpar seleção"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              select(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                select(null);
              }
            }}
            className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={14} />
          </span>
        )}
        <ChevronDown size={15} className="shrink-0 text-slate-400" />
      </button>

      {/* Valor para FormData + validação nativa de "obrigatório" */}
      {name && (
        <input
          type="text"
          name={name}
          value={selected?.id ?? ""}
          required={required}
          onChange={() => {}}
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      )}

      {/* Painel de busca (portado — não sofre clip do layout) */}
      {open && (
        <OverlayPortal>
          <div
            ref={panelRef}
            style={panelStyle}
            className={`${OVERLAY_Z_CLASS} overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg animate-[dropdown-in_.12s_ease-out]`}
          >
            <div className="relative border-b border-slate-100">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                role="combobox"
                aria-expanded
                className="w-full py-2 pl-9 pr-8 text-sm outline-none placeholder:text-slate-400"
              />
              {loading && (
                <Loader2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                />
              )}
            </div>
            <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
              {!loading && options.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-slate-400">
                  {query
                    ? `Nada encontrado para "${query.trim()}".`
                    : "Nenhum registro disponível."}
                </li>
              )}
              {options.map((opt, i) => (
                <li key={opt.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onClick={() => select(opt)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      i === active
                        ? "bg-indigo-50 text-indigo-800"
                        : "text-slate-700"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {opt.label}
                    </span>
                    {opt.sub && (
                      <span className="shrink-0 truncate text-xs text-slate-400">
                        {opt.sub}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {options.length === 20 && (
                <li className="px-3 py-1.5 text-center text-[11px] text-slate-400">
                  Mostrando os 20 primeiros — refine a busca.
                </li>
              )}
            </ul>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
