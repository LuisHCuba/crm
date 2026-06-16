import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { gqlClient } from "../../lib/graphql";
import {
  FINANCE_LINKS_QUERY,
  type FinanceLinkEntry,
} from "../../lib/queries/financeiro";
import { formatCurrency, formatDate } from "../../lib/format";
import { effectiveStatus, num } from "../../lib/financeiro-utils";

const STATUS_LABEL: Record<string, string> = {
  paid: "Liquidado",
  overdue: "Vencido",
  pending: "A vencer",
  cancelled: "Cancelado",
};
const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
  pending: "bg-amber-50 text-amber-700",
  cancelled: "bg-slate-100 text-slate-500",
};

interface FinanceCardProps {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

function buildWhere(props: FinanceCardProps) {
  const cond: Record<string, unknown> = { archived: { _eq: false } };
  if (props.contactId) cond.contact_id = { _eq: props.contactId };
  if (props.companyId) cond.company_id = { _eq: props.companyId };
  if (props.dealId) cond.deal_id = { _eq: props.dealId };
  return cond;
}

function EntryRow({
  entry,
  to,
}: {
  entry: FinanceLinkEntry;
  to: string;
}) {
  const eff = effectiveStatus(entry.status, entry.due_date);
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-indigo-300 hover:bg-indigo-50/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">
          {entry.description}
        </p>
        <p className="text-xs text-slate-400">Vence {formatDate(entry.due_date)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-semibold text-slate-900">
          {formatCurrency(entry.value)}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            STATUS_STYLE[eff] ?? STATUS_STYLE.pending
          }`}
        >
          {STATUS_LABEL[eff] ?? eff}
        </span>
      </div>
    </Link>
  );
}

/** Card "Financeiro" exibido nos record pages do CRM (EXIGÊNCIA 3). */
export function FinanceCard(props: FinanceCardProps) {
  const where = buildWhere(props);

  const { data, isLoading } = useQuery({
    queryKey: [
      "finance-links",
      props.contactId ?? "",
      props.companyId ?? "",
      props.dealId ?? "",
    ],
    queryFn: () =>
      gqlClient.request<{
        receivables: FinanceLinkEntry[];
        payables: FinanceLinkEntry[];
      }>(FINANCE_LINKS_QUERY, { recWhere: where, payWhere: where }),
    enabled: !!(props.contactId || props.companyId || props.dealId),
  });

  const receivables = data?.receivables ?? [];
  const payables = data?.payables ?? [];

  const openReceivable = receivables
    .filter((r) => effectiveStatus(r.status, r.due_date) !== "paid")
    .reduce((s, r) => s + num(r.value), 0);
  const openPayable = payables
    .filter((p) => effectiveStatus(p.status, p.due_date) !== "paid")
    .reduce((s, p) => s + num(p.value), 0);

  const empty = receivables.length === 0 && payables.length === 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Wallet size={16} className="text-indigo-600" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Financeiro
        </h3>
      </div>

      <div className="space-y-4 p-4">
        {isLoading && <p className="text-sm text-slate-400">Carregando…</p>}

        {!isLoading && empty && (
          <p className="text-sm text-slate-400">
            Nenhum lançamento vinculado.
          </p>
        )}

        {receivables.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <ArrowDownCircle size={14} /> A receber
              </span>
              <span className="text-xs font-medium text-slate-500">
                Em aberto: {formatCurrency(openReceivable)}
              </span>
            </div>
            <div className="space-y-2">
              {receivables.map((r) => (
                <EntryRow
                  key={r.id}
                  entry={r}
                  to={`/financeiro/receber?focus=${r.id}`}
                />
              ))}
            </div>
          </div>
        )}

        {payables.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                <ArrowUpCircle size={14} /> A pagar
              </span>
              <span className="text-xs font-medium text-slate-500">
                Em aberto: {formatCurrency(openPayable)}
              </span>
            </div>
            <div className="space-y-2">
              {payables.map((p) => (
                <EntryRow
                  key={p.id}
                  entry={p}
                  to={`/financeiro/pagar?focus=${p.id}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
