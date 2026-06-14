import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  getRowKey?: (row: T, index: number) => string;
};

function cellValue<T extends object>(row: T, key: string): ReactNode {
  if (key in row) {
    const v = row[key as keyof T];
    if (v === null || v === undefined) return "—";
    return String(v);
  }
  return "—";
}

export function DataTable<T extends object>({
  columns,
  data,
  loading,
  onRowClick,
  emptyMessage = "Nenhum registro.",
  className,
  getRowKey,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-[var(--color-muted)]"
                >
                  Carregando…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-[var(--color-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const interactiveRowProps = onRowClick
                  ? ({
                      role: "button" as const,
                      tabIndex: 0 as const,
                      onClick: () => onRowClick(row),
                      onKeyDown: (e: KeyboardEvent<HTMLTableRowElement>) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      },
                    } satisfies HTMLAttributes<HTMLTableRowElement>)
                  : {};

                return (
                  <tr
                    key={getRowKey?.(row, index) ?? index}
                    {...interactiveRowProps}
                    className={cn(
                      "border-b border-[var(--color-border)] transition-colors last:border-b-0",
                      onRowClick &&
                        "cursor-pointer hover:bg-[var(--color-accent-soft)] focus-visible:bg-[var(--color-accent-soft)] focus-visible:outline-none",
                      !onRowClick && "hover:bg-[var(--color-surface-hover)]",
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-[var(--color-text)]"
                      >
                        {col.render ? col.render(row) : cellValue(row, col.key)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
