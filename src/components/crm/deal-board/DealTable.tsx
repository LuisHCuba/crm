import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDate } from "../../../lib/format";
import { STAGE_TYPE_STYLES } from "../labels";
import { Avatar, Badge } from "../ui";
import { Pagination } from "../listview";
import type { DealListItem } from "../../../lib/queries/crm";

export function DealTable({
  rows,
  selected,
  onToggleOne,
  onToggleAll,
  page,
  pageCount,
  perPage,
  onPageChange,
  onPerPageChange,
}: {
  rows: DealListItem[];
  selected: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: () => void;
  page: number;
  pageCount: number;
  perPage: number;
  onPageChange: (p: number) => void;
  onPerPageChange: (n: number) => void;
}) {
  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someOnPageSelected = rows.some((r) => selected.has(r.id));
  const headerRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerRef.current)
      headerRef.current.indeterminate = someOnPageSelected && !allOnPageSelected;
  }, [someOnPageSelected, allOnPageSelected]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input
                  ref={headerRef}
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={onToggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-2.5">Nome do negócio</th>
              <th className="px-4 py-2.5">Etapa do negócio</th>
              <th className="px-4 py-2.5">Proprietário do negócio</th>
              <th className="px-4 py-2.5 text-right">Valor</th>
              <th className="px-4 py-2.5">Itens de linha</th>
              <th className="px-4 py-2.5">Data de fechamento</th>
              <th className="px-4 py-2.5">Data de criação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((d) => {
              const checked = selected.has(d.id);
              const itemCount = d.line_items_aggregate?.aggregate?.count ?? 0;
              return (
                <tr
                  key={d.id}
                  className={`transition ${
                    checked ? "bg-indigo-50/50" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleOne(d.id)}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      to={`/negocios/${d.id}`}
                      className="font-medium text-indigo-700 hover:underline"
                    >
                      {d.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    {d.stage ? (
                      <Badge className={STAGE_TYPE_STYLES[d.stage.type]}>
                        {d.stage.name}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {d.responsible ? (
                      <span className="flex items-center gap-1.5">
                        <Avatar
                          name={d.responsible.name}
                          url={d.responsible.avatar_url}
                          size={20}
                        />
                        <span className="truncate">{d.responsible.name}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Nenhum proprietário</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {formatCurrency(d.total_value)}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {itemCount > 0 ? (
                      `${itemCount} ${itemCount > 1 ? "itens" : "item"}`
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-slate-500">
                    {formatDate(d.closed_at)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-slate-500">
                    {formatDate(d.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageCount={pageCount}
        perPage={perPage}
        perPageOptions={[25, 50, 100]}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
      />
    </div>
  );
}
