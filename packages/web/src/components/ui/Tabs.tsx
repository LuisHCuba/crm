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
      className={`flex flex-wrap gap-1 ${className ?? ""}`}
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
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-text)]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
