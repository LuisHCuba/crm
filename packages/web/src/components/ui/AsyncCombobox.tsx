import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/cn";

type AsyncComboboxProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  searchFn: (query: string) => Promise<{ value: string; label: string }[]>;
  disabled?: boolean;
  className?: string;
};

export function AsyncCombobox({
  label,
  placeholder = "Buscar...",
  value,
  onChange,
  searchFn,
  disabled = false,
  className,
}: AsyncComboboxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
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
      }, 300);
    },
    [searchFn],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      setQuery("");
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setSelectedLabel("");
    setIsOpen(true);
    search(val);
  }

  function handleSelect(option: { value: string; label: string }) {
    setSelectedLabel(option.label);
    setQuery("");
    setIsOpen(false);
    onChange(option.value);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  const displayValue = selectedLabel || query;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "h-10 w-full rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-[var(--shadow-xs)] outline-none transition-[border-color,box-shadow] duration-150",
          "placeholder:text-[var(--color-faint)]",
          "focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-ring)_35%,transparent)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-elevated)] p-1 shadow-[var(--shadow-lg)]">
          {loading ? (
            <div className="px-3 py-2 text-sm text-[var(--color-muted)]">Buscando...</div>
          ) : results.length === 0 && query.trim() ? (
            <div className="px-3 py-2 text-sm text-[var(--color-muted)]">Nenhum resultado</div>
          ) : (
            results.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className="w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
