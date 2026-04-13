import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Briefcase,
  Building2,
  FolderOpen,
  ListChecks,
  Package,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";

type SearchHit = {
  id: string;
  label: string;
  sublabel?: string | null;
};

type TaskHit = SearchHit & {
  projectId?: string | null;
};

type BuscaResponse = {
  companies?: SearchHit[];
  contacts?: SearchHit[];
  deals?: SearchHit[];
  products?: SearchHit[];
  projects?: SearchHit[];
  receivables?: SearchHit[];
  payables?: SearchHit[];
  tasks?: TaskHit[];
};

type GroupKey = keyof BuscaResponse;

const GROUPS: {
  key: GroupKey;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "companies", label: "Empresas", icon: Building2 },
  { key: "contacts", label: "Contatos", icon: Users },
  { key: "deals", label: "Negócios", icon: Briefcase },
  { key: "products", label: "Produtos", icon: Package },
  { key: "projects", label: "Projetos", icon: FolderOpen },
  { key: "tasks", label: "Tarefas", icon: ListChecks },
  { key: "receivables", label: "Contas a receber", icon: ArrowDownCircle },
  { key: "payables", label: "Contas a pagar", icon: ArrowUpCircle },
];

function normalizeList(v: unknown): SearchHit[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is SearchHit =>
      x !== null &&
      typeof x === "object" &&
      typeof (x as SearchHit).id === "string" &&
      typeof (x as SearchHit).label === "string",
  );
}

function normalizeTasks(v: unknown): TaskHit[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is TaskHit =>
      x !== null &&
      typeof x === "object" &&
      typeof (x as TaskHit).id === "string" &&
      typeof (x as TaskHit).label === "string",
  );
}

function parseBuscaResponse(data: unknown): BuscaResponse {
  if (data === null || typeof data !== "object") return {};
  const o = data as Record<string, unknown>;
  return {
    companies: normalizeList(o.companies),
    contacts: normalizeList(o.contacts),
    deals: normalizeList(o.deals),
    products: normalizeList(o.products),
    projects: normalizeList(o.projects),
    receivables: normalizeList(o.receivables),
    payables: normalizeList(o.payables),
    tasks: normalizeTasks(o.tasks),
  };
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BuscaResponse | null>(null);

  const trimmed = query.trim();
  const showDropdown = trimmed.length > 0 && !dismissed;

  useEffect(() => {
    if (!trimmed) setDismissed(false);
  }, [trimmed]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length === 0) {
      setDebouncedQuery("");
      setResults(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setDebouncedQuery(q);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length === 0) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setResults(null);
    api
      .get<unknown>("/busca", { params: { q: debouncedQuery } })
      .then((res) => {
        if (!cancelled) setResults(parseBuscaResponse(res.data));
      })
      .catch(() => {
        if (!cancelled) setResults(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDismissed(false);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el || !(e.target instanceof Node) || el.contains(e.target)) return;
      setDismissed(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const closeAfterNavigate = useCallback(() => {
    setDismissed(true);
    setQuery("");
    setDebouncedQuery("");
    setResults(null);
  }, []);

  const onSelect = useCallback(
    (key: GroupKey, item: SearchHit | TaskHit) => {
      switch (key) {
        case "companies":
          navigate(`/empresas/${item.id}`);
          closeAfterNavigate();
          return;
        case "contacts":
          navigate(`/contatos/${item.id}`);
          closeAfterNavigate();
          return;
        case "deals":
          navigate(`/negocios/${item.id}`);
          closeAfterNavigate();
          return;
        case "products":
          navigate(`/produtos/${item.id}`);
          closeAfterNavigate();
          return;
        case "projects":
          navigate(`/projetos/${item.id}`);
          closeAfterNavigate();
          return;
        case "receivables":
          navigate(`/contas-receber/${item.id}`);
          closeAfterNavigate();
          return;
        case "payables":
          navigate(`/contas-pagar/${item.id}`);
          closeAfterNavigate();
          return;
        case "tasks": {
          const pid =
            "projectId" in item && item.projectId
              ? String(item.projectId)
              : null;
          if (pid) {
            navigate(`/projetos/${pid}/tarefas/${item.id}`);
            closeAfterNavigate();
          } else {
            setDismissed(true);
          }
          return;
        }
        default:
          return;
      }
    },
    [navigate, closeAfterNavigate],
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setDismissed(true);
    }
  };

  const totalHits =
    results === null
      ? 0
      : GROUPS.reduce((acc, g) => {
          const list = results[g.key];
          return acc + (Array.isArray(list) ? list.length : 0);
        }, 0);

  return (
    <div ref={rootRef} className="relative w-full">
      <Input
        ref={inputRef}
        variant="search"
        placeholder="Buscar... ⌘K"
        aria-label="Buscar"
        aria-expanded={showDropdown ? "true" : "false"}
        aria-haspopup="dialog"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onInputKeyDown}
        onFocus={() => setDismissed(false)}
        className="[&_input]:bg-[var(--color-bg)]"
      />
      {showDropdown ? (
        <div
          aria-label="Resultados da busca"
          className={cn(
            "absolute left-0 right-0 top-full z-[120] mt-1 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 shadow-lg",
          )}
        >
          {loading ? (
            <p className="px-3 py-2 text-sm text-[var(--color-muted)]">
              Buscando…
            </p>
          ) : !loading && (results === null || totalHits === 0) ? (
            <p className="px-3 py-2 text-sm text-[var(--color-muted)]">
              Nenhum resultado para &apos;{debouncedQuery}&apos;
            </p>
          ) : (
            GROUPS.map(({ key, label, icon: Icon }) => {
              const list = results?.[key];
              if (!list?.length) return null;
              return (
                <div key={key} className="px-1 pb-2 last:pb-0">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                    <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                    {label}
                  </div>
                  <ul className="space-y-0.5">
                    {list.map((item) => (
                      <li key={`${key}-${item.id}`}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-[var(--color-accent-soft)]"
                          onClick={() => onSelect(key, item)}
                        >
                          <span className="font-semibold text-[var(--color-text)]">
                            {item.label}
                          </span>
                          {item.sublabel ? (
                            <span className="text-xs text-[var(--color-muted)]">
                              {item.sublabel}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
