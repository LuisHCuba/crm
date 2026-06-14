import { cn } from "@/lib/cn";

type TabsProps = {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
};

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1",
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
              isActive
                ? "bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-xs)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
