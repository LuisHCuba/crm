import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { gql } from "graphql-request";
import {
  Briefcase,
  Building2,
  FileText,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { gqlClient } from "../../lib/graphql";

/* ------------------------------------------------------------------ */
/*  Busca global (Ctrl+K) — contatos, empresas, negócios e propostas   */
/* ------------------------------------------------------------------ */

const GLOBAL_SEARCH = gql`
  query GlobalSearch($q: String!) {
    contacts(
      where: {
        archived: { _eq: false }
        _or: [{ full_name: { _ilike: $q } }, { email: { _ilike: $q } }]
      }
      limit: 5
      order_by: { full_name: asc }
    ) {
      id
      full_name
      email
    }
    companies(
      where: {
        archived: { _eq: false }
        _or: [{ legal_name: { _ilike: $q } }, { trade_name: { _ilike: $q } }]
      }
      limit: 5
      order_by: { legal_name: asc }
    ) {
      id
      legal_name
      trade_name
    }
    deals(
      where: { archived: { _eq: false }, title: { _ilike: $q } }
      limit: 5
      order_by: { created_at: desc }
    ) {
      id
      title
    }
    proposals(
      where: { archived: { _eq: false }, title: { _ilike: $q } }
      limit: 4
      order_by: { updated_at: desc }
    ) {
      id
      title
    }
  }
`;

interface SearchData {
  contacts: { id: string; full_name: string; email: string | null }[];
  companies: { id: string; legal_name: string; trade_name: string | null }[];
  deals: { id: string; title: string }[];
  proposals: { id: string; title: string }[];
}

interface ResultItem {
  key: string;
  group: string;
  icon: typeof Users;
  label: string;
  sub?: string | null;
  to: string;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Atalho global Ctrl/Cmd+K foca a busca.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Fecha ao clicar fora.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Debounce da digitação.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () =>
      gqlClient.request<SearchData>(GLOBAL_SEARCH, { q: `%${debounced}%` }),
    enabled,
    staleTime: 30_000,
  });

  const items = useMemo<ResultItem[]>(() => {
    if (!data) return [];
    return [
      ...data.contacts.map((c) => ({
        key: `c-${c.id}`,
        group: "Contatos",
        icon: Users,
        label: c.full_name,
        sub: c.email,
        to: `/contatos/${c.id}`,
      })),
      ...data.companies.map((co) => ({
        key: `e-${co.id}`,
        group: "Empresas",
        icon: Building2,
        label: co.trade_name || co.legal_name,
        sub: co.trade_name ? co.legal_name : null,
        to: `/empresas/${co.id}`,
      })),
      ...data.deals.map((dl) => ({
        key: `n-${dl.id}`,
        group: "Negócios",
        icon: Briefcase,
        label: dl.title,
        to: `/negocios/${dl.id}`,
      })),
      ...data.proposals.map((p) => ({
        key: `p-${p.id}`,
        group: "Propostas",
        icon: FileText,
        label: p.title,
        to: `/propostas`,
      })),
    ];
  }, [data]);

  // Índice ativo sempre válido quando os resultados mudam.
  useEffect(() => {
    setActive(0);
  }, [debounced, items.length]);

  const go = (item: ResultItem) => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    navigate(item.to);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active] ?? items[0];
      if (item) go(item);
    }
  };

  const showPanel = open && enabled;
  let lastGroup = "";

  return (
    <div ref={rootRef} className="relative">
      <Search
        size={15}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onInputKeyDown}
        placeholder="Buscar contatos, empresas, negócios..."
        role="combobox"
        aria-expanded={showPanel}
        aria-label="Busca global"
        className="h-7 w-full rounded-md border border-white/10 bg-white/10 pl-8 pr-16 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white/15 focus:ring-2 focus:ring-indigo-500/30"
      />
      {isFetching ? (
        <Loader2
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
        />
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 sm:flex">
          Ctrl K
        </kbd>
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-[dropdown-in_.12s_ease-out]">
          {items.length === 0 && !isFetching && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              Nada encontrado para "{debounced}".
            </p>
          )}
          {items.map((item, i) => {
            const header =
              item.group !== lastGroup ? (
                <p className="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.group}
                </p>
              ) : null;
            lastGroup = item.group;
            return (
              <div key={item.key}>
                {header}
                <button
                  onClick={() => go(item)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
                    i === active
                      ? "bg-indigo-50 text-indigo-800"
                      : "text-slate-700"
                  }`}
                >
                  <item.icon size={15} className="shrink-0 text-slate-400" />
                  <span className="truncate font-medium">{item.label}</span>
                  {item.sub && (
                    <span className="ml-auto truncate pl-3 text-xs text-slate-400">
                      {item.sub}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
