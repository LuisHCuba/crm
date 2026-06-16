import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Landmark,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { gqlClient } from "../../lib/graphql";
import {
  PAYABLES_QUERY,
  RECEIVABLES_FIN_QUERY,
  BANK_ACCOUNTS_QUERY,
  type Payable,
  type Receivable,
} from "../../lib/queries/financeiro";
import { formatCurrency, formatDate } from "../../lib/format";
import { effectiveStatus, num, daysUntil } from "../../lib/financeiro-utils";
import { MetricCard, StatusBadge } from "../../components/financeiro/ui";

interface BankAcc {
  id: string;
  name: string;
  initial_balance: string | null;
  transactions_aggregate: { aggregate: { sum: { amount: string | null } } };
}

export default function Overview() {
  const payablesQ = useQuery({
    queryKey: ["fin-payables"],
    queryFn: () => gqlClient.request<{ payables: Payable[] }>(PAYABLES_QUERY),
  });
  const receivablesQ = useQuery({
    queryKey: ["fin-receivables"],
    queryFn: () => gqlClient.request<{ receivables: Receivable[] }>(RECEIVABLES_FIN_QUERY),
  });
  const banksQ = useQuery({
    queryKey: ["fin-bank-accounts"],
    queryFn: () => gqlClient.request<{ bank_accounts: BankAcc[] }>(BANK_ACCOUNTS_QUERY),
  });

  const payables = payablesQ.data?.payables ?? [];
  const receivables = receivablesQ.data?.receivables ?? [];
  const banks = banksQ.data?.bank_accounts ?? [];

  const balance = useMemo(
    () =>
      banks.reduce(
        (s, b) => s + num(b.initial_balance) + num(b.transactions_aggregate.aggregate.sum.amount),
        0
      ),
    [banks]
  );

  const openSum = (list: (Payable | Receivable)[]) =>
    list
      .filter((i) => {
        const e = effectiveStatus(i.status, i.due_date);
        return e === "pending" || e === "overdue";
      })
      .reduce((s, i) => s + num(i.value), 0);

  const toReceive = openSum(receivables);
  const toPay = openSum(payables);

  const alerts = useMemo(() => {
    const tag = (list: (Payable | Receivable)[], kind: "payable" | "receivable") =>
      list
        .map((i) => ({ ...i, kind, eff: effectiveStatus(i.status, i.due_date), d: daysUntil(i.due_date) }))
        .filter((i) => i.eff === "overdue" || (i.eff === "pending" && (i.d ?? 99) <= 15));
    const all = [...tag(payables, "payable"), ...tag(receivables, "receivable")];
    all.sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
    return all;
  }, [payables, receivables]);

  const overdueCount = alerts.filter((a) => a.eff === "overdue").length;
  const loading = payablesQ.isLoading || receivablesQ.isLoading || banksQ.isLoading;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="animate-spin" size={18} /> Carregando visão geral…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Saldo em contas"
          value={formatCurrency(balance)}
          accent={balance >= 0 ? "text-slate-900" : "text-red-600"}
          sub={`${banks.length} conta(s)`}
        />
        <MetricCard label="A receber (aberto)" value={formatCurrency(toReceive)} accent="text-emerald-600" />
        <MetricCard label="A pagar (aberto)" value={formatCurrency(toPay)} accent="text-rose-600" />
        <MetricCard
          label="Resultado previsto"
          value={formatCurrency(toReceive - toPay)}
          accent={toReceive - toPay >= 0 ? "text-emerald-600" : "text-red-600"}
          sub="A receber − a pagar"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-900">Vencimentos (vencidos e próximos 15 dias)</h3>
            </div>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                <AlertTriangle size={12} /> {overdueCount} vencido(s)
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Nenhum vencimento crítico. Tudo em dia. 🎉
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {alerts.slice(0, 12).map((a) => (
                  <tr key={`${a.kind}-${a.id}`} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {a.kind === "receivable" ? (
                          <ArrowDownCircle size={16} className="text-emerald-500" />
                        ) : (
                          <ArrowUpCircle size={16} className="text-rose-500" />
                        )}
                        <span className="font-medium text-slate-800">{a.description}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(a.due_date)}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {a.eff === "overdue"
                        ? `vencido há ${Math.abs(a.d ?? 0)}d`
                        : a.d === 0
                        ? "vence hoje"
                        : `em ${a.d}d`}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(a.value)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={a.status} dueDate={a.due_date} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-900">
              <Landmark size={18} className="text-indigo-500" />
              <h3 className="font-semibold">Contas correntes</h3>
            </div>
            <div className="space-y-2">
              {banks.map((b) => {
                const bal = num(b.initial_balance) + num(b.transactions_aggregate.aggregate.sum.amount);
                return (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{b.name}</span>
                    <span className={`font-semibold ${bal >= 0 ? "text-slate-900" : "text-red-600"}`}>
                      {formatCurrency(bal)}
                    </span>
                  </div>
                );
              })}
              {banks.length === 0 && (
                <p className="text-sm text-slate-400">Nenhuma conta cadastrada.</p>
              )}
            </div>
            <Link
              to="/financeiro/contas"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
            >
              <TrendingUp size={14} /> Ver extratos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
