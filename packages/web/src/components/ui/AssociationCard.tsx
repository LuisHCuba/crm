import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type AssociationCardProps = {
  title: string;
  count?: number;
  action?: { label: string; icon?: React.ReactNode; onClick: () => void };
  children: React.ReactNode;
  footer?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export function AssociationCard({
  title,
  count,
  action,
  children,
  footer,
  defaultOpen = true,
  className,
}: AssociationCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
        <span className="flex-1">{title}</span>
        {count !== undefined && (
          <span className="rounded-full bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-accent)]">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="px-3 pb-2">{children}</div>
          {(action || footer) && (
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2">
              {footer ?? <span />}
              {action && (
                <button
                  type="button"
                  onClick={action.onClick}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                >
                  {action.icon}
                  {action.label}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
