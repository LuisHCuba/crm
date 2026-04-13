import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/cn";

type BaseProps = {
  label: string;
  className?: string;
};

type TextFieldProps = BaseProps & {
  type: "text" | "date" | "email";
  value: string | null | undefined;
  displayValue?: string;
  onSave: (value: string) => void;
};

type SelectFieldProps = BaseProps & {
  type: "select";
  value: string | null | undefined;
  displayValue?: string;
  options: { value: string; label: string }[];
  onSave: (value: string) => void;
};

type SearchFieldProps = BaseProps & {
  type: "search";
  value: string | null | undefined;
  displayValue?: string;
  searchFn: (query: string) => Promise<{ value: string; label: string }[]>;
  onSave: (value: string) => void;
};

type ReadonlyFieldProps = BaseProps & {
  type: "readonly";
  value: string | null | undefined;
  displayValue?: string;
};

type EditableFieldProps =
  | TextFieldProps
  | SelectFieldProps
  | SearchFieldProps
  | ReadonlyFieldProps;

export function EditableField(props: EditableFieldProps) {
  const { label, className } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  const display = props.displayValue ?? props.value ?? "—";

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  function startEdit() {
    if (props.type === "readonly") return;
    if (props.type === "search") {
      setDraft("");
    } else {
      setDraft(props.value ?? "");
    }
    setEditing(true);
  }

  function save() {
    if (props.type === "readonly" || props.type === "search") return;
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (props.value ?? "")) {
      props.onSave(trimmed);
    }
  }

  function cancel() {
    setEditing(false);
  }

  if (editing && props.type === "search") {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {label}
        </span>
        <InlineSearch
          searchFn={props.searchFn}
          onSelect={(val) => {
            setEditing(false);
            if (val !== (props.value ?? "")) {
              props.onSave(val);
            }
          }}
          onCancel={cancel}
        />
      </div>
    );
  }

  if (editing && props.type !== "readonly") {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {label}
        </span>
        {props.type === "select" ? (
          <select
            ref={inputRef as any}
            value={draft}
            aria-label={label}
            onChange={(e) => {
              setDraft(e.target.value);
              setEditing(false);
              const val = e.target.value;
              if (val !== (props.value ?? "")) {
                props.onSave(val);
              }
            }}
            onBlur={cancel}
            className="w-full rounded border border-[var(--color-accent)] bg-[var(--color-surface)] px-1.5 py-1 text-sm text-[var(--color-text)] outline-none"
          >
            <option value="">—</option>
            {props.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as any}
            type={props.type}
            value={draft}
            aria-label={label}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className="w-full rounded border border-[var(--color-accent)] bg-[var(--color-surface)] px-1.5 py-1 text-sm text-[var(--color-text)] outline-none"
          />
        )}
      </div>
    );
  }

  const isEditable = props.type !== "readonly";

  return (
    <div
      className={cn("group flex flex-col gap-0.5", className)}
      {...(isEditable
        ? {
            role: "button" as const,
            tabIndex: 0,
            onClick: startEdit,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter") startEdit();
            },
          }
        : {})}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <span
        className={cn(
          "flex items-center gap-1 truncate text-sm text-[var(--color-text)]",
          isEditable &&
            "cursor-pointer rounded px-1 py-0.5 -mx-1 hover:bg-[var(--color-accent-soft)]",
        )}
      >
        <span className="flex-1 truncate">{display}</span>
        {isEditable && (
          <Pencil className="size-3 shrink-0 text-[var(--color-muted)] opacity-0 group-hover:opacity-100" />
        )}
      </span>
    </div>
  );
}

function InlineSearch({
  searchFn,
  onSelect,
  onCancel,
}: {
  searchFn: (q: string) => Promise<{ value: string; label: string }[]>;
  onSelect: (value: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onCancel]);

  const doSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const data = await searchFn(q);
          setResults(data);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 250);
    },
    [searchFn],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        aria-label="Buscar"
        placeholder="Digite para buscar…"
        onChange={(e) => {
          setQuery(e.target.value);
          doSearch(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        className="w-full rounded border border-[var(--color-accent)] bg-[var(--color-surface)] px-1.5 py-1 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)]"
      />
      {(loading || results.length > 0 || (query.trim() && !loading)) && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          {loading ? (
            <div className="px-2 py-1.5 text-xs text-[var(--color-muted)]">
              Buscando…
            </div>
          ) : results.length === 0 && query.trim() ? (
            <div className="px-2 py-1.5 text-xs text-[var(--color-muted)]">
              Nenhum resultado
            </div>
          ) : (
            results.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(opt.value)}
                className="w-full px-2 py-1.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]"
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
