import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  PieChart,
  Table2,
  Wallet,
} from "lucide-react";
import { gqlClient } from "../../lib/graphql";
import {
  PAYABLES_QUERY,
  RECEIVABLES_FIN_QUERY,
  BANK_ACCOUNTS_QUERY,
  FIN_TIMELINE_BANK_TX_QUERY,
  type Payable,
  type Receivable,
  type BankTransaction,
} from "../../lib/queries/financeiro";
import { formatCurrency, formatDate } from "../../lib/format";
import { effectiveStatus, num, daysUntil } from "../../lib/financeiro-utils";
import {
  buildTimelineReport,
  periodRange,
  PERIOD_OPTIONS,
  VIEW_OPTIONS,
  type TimelinePeriod,
  type TimelineView,
  type CategorySlice,
} from "../../lib/financeiro-timeline";
import { MetricCard, StatusBadge } from "../../components/financeiro/ui";
import { TimelineChart } from "../../components/financeiro/TimelineChart";
import { FinanceTimelineFeed } from "../../components/financeiro/FinanceTimelineFeed";
import { Skeleton } from "../../components/crm/ui";

interface BankAcc {
  id: string;
  name: string;
  initial_balance: string | null;
  transactions_aggregate: { aggregate: { sum: { amount: string | null } } };
}

/* ------------------------------------------------------------------ */
/*  Barras por categoria                                               */
/* ------------------------------------------------------------------ */

function CategoryBars({
  title,
  slices,
  color,
}: {
  title: string;
  slices: CategorySlice[];
  color: "in" | "out";
}) {
  const bar = color === "in" ? "#059669" : "#f43f5e";
  const text = color === "in" ? "text-emerald-700" : "text-rose-700";

  if (slices.length === 0) {
    return (
      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-800">{title}</h4>
        <p className="py-4 text-center text-sm text-slate-400">
          Sem dados no período.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {slices.slice(0, 7).map((s) => (
        <div key={s.name} title={`${s.name}: ${formatCurrency(s.value)} (${s.pct.toFixed(1)}%)`}>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className="truncate text-slate-600">{s.name}</span>
            <span
              className={`shrink-0 font-semibold ${text}`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatCurrency(s.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${s.pct}%`, background: bar }}
            />
          </div>
        </div>
      ))}
      {slices.length > 7 && (
        <p className="text-xs text-slate-400">
          + {slices.length - 7} categoria(s) menores
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton da página                                                 */
/* ------------------------------------------------------------------ */

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-72 w-full" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Visão geral (unificada com a linha do tempo)                       */
/* ------------------------------------------------------------------ */

export default function Overview() {
  const [period, setPeriod] = useState<TimelinePeriod>("12m");
  const [view, setView] = useState<TimelineView>("combined");

  const range = useMemo(() => periodRange(period), [period]);

  const payablesQ = useQuery({
    queryKey: ["fin-payables"],
    queryFn: () => gqlClient.request<{ payables: Payable[] }>(PAYABLES_QUERY),
  });
  const receivablesQ = useQuery({
    queryKey: ["fin-receivables"],
    queryFn: () =>
      gqlClient.request<{ receivables: Receivable[] }>(RECEIVABLES_FIN_QUERY),
  });
  const banksQ = useQuery({
    queryKey: ["fin-bank-accounts"],
    queryFn: () =>
      gqlClient.request<{ bank_accounts: BankAcc[] }>(BANK_ACCOUNTS_QUERY),
  });
  const bankTxQ = useQuery({
    queryKey: ["fin-timeline-tx", range.from, range.to],
    queryFn: () =>
      gqlClient.request<{ bank_transactions: BankTransaction[] }>(
        FIN_TIMELINE_BANK_TX_QUERY,
        { from: range.from, to: range.to }
      ),
  });

  const payables = payablesQ.data?.payables ?? [];
  const receivables = receivablesQ.data?.receivables ?? [];
  const banks = banksQ.data?.bank_accounts ?? [];

  /* --- Estado atual (independe do período) --- */
  const balance = useMemo(
    () =>
      banks.reduce(
        (s, b) =>
          s + num(b.initial_balance) + num(b.transactions_aggregate.aggregate.sum.amount),
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
        .map((i) => ({
          ...i,
          kind,
          eff: effectiveStatus(i.status, i.due_date),
          d: daysUntil(i.due_date),
        }))
        .filter((i) => i.eff === "overdue" || (i.eff === "pending" && (i.d ?? 99) <= 15));
    const all = [...tag(payables, "payable"), ...tag(receivables, "receivable")];
    all.sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
    return all;
  }, [payables, receivables]);

  const overdueCount = alerts.filter((a) => a.eff === "overdue").length;

  /* --- Relatório do período (linha do tempo) --- */
  const report = useMemo(() => {
    const bankTx = bankTxQ.data?.bank_transactions ?? [];
    const bankTxInPeriodSum = bankTx.reduce((s, t) => s + num(t.amount), 0);
    return buildTimelineReport({
      from: range.from,
      to: range.to,
      view,
      bankTx,
      payables,
      receivables,
      banksBalance: balance,
      bankTxInPeriodSum,
    });
  }, [range, view, bankTxQ.data, payables, receivables, balance]);

  const loading =
    payablesQ.isLoading || receivablesQ.isLoading || banksQ.isLoading || bankTxQ.isLoading;
  const failed = payablesQ.error || receivablesQ.error || banksQ.error || bankTxQ.error;

  if (loading) return <OverviewSkeleton />;

  // Erro nunca deve parecer "saldo zerado / tudo em dia".
  if (failed) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <span className="text-sm">
          Não foi possível carregar a visão geral do financeiro.
        </span>
        <button
          onClick={() => {
            payablesQ.refetch();
            receivablesQ.refetch();
            banksQ.refetch();
            bankTxQ.refetch();
          }}
          className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const showForecast = view === "combined" || view === "forecast";
  const forecastNet = report.forecastIn - report.forecastOut;

  return (
    <div className="space-y-6">
      {/* ---------- Filtros (uma linha acima dos gráficos) ---------- */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">
            {formatDate(report.from)} — {formatDate(report.to)}
          </span>{" "}
          · {report.events.length} eventos
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Período">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPeriod(o.value)}
                aria-pressed={period === o.value}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  period === o.value
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div
            className="flex flex-wrap gap-1 border-t border-slate-100 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0"
            role="group"
            aria-label="Visão"
          >
            {VIEW_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                title={o.hint}
                onClick={() => setView(o.value)}
                aria-pressed={view === o.value}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  view === o.value
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Estado atual ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Saldo em contas"
          value={formatCurrency(balance)}
          accent={balance >= 0 ? "text-slate-900" : "text-red-600"}
          sub={`${banks.length} conta(s) · hoje`}
        />
        <MetricCard
          label="A receber (aberto)"
          value={formatCurrency(toReceive)}
          accent="text-emerald-700"
        />
        <MetricCard
          label="A pagar (aberto)"
          value={formatCurrency(toPay)}
          accent="text-rose-700"
        />
        <MetricCard
          label="Resultado previsto"
          value={formatCurrency(toReceive - toPay)}
          accent={toReceive - toPay >= 0 ? "text-emerald-700" : "text-red-600"}
          sub="A receber − a pagar"
        />
      </div>

      {/* ---------- Fluxo de caixa do período ---------- */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange size={18} className="text-indigo-500" />
            <h3 className="font-semibold text-slate-900">Fluxo de caixa no período</h3>
          </div>
          <div
            className="flex flex-wrap gap-x-5 gap-y-1 text-sm"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            <span className="text-slate-500">
              Entradas{" "}
              <span className="font-semibold text-emerald-700">
                {formatCurrency(report.totalIn)}
              </span>
            </span>
            <span className="text-slate-500">
              Saídas{" "}
              <span className="font-semibold text-rose-700">
                {formatCurrency(report.totalOut)}
              </span>
            </span>
            <span className="text-slate-500">
              Resultado{" "}
              <span
                className={`font-semibold ${
                  report.totalNet >= 0 ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {formatCurrency(report.totalNet)}
              </span>
            </span>
            <span className="text-slate-500">
              Saldo final{" "}
              <span
                className={`font-semibold ${
                  report.closingBalance >= 0 ? "text-indigo-700" : "text-red-600"
                }`}
              >
                {formatCurrency(report.closingBalance)}
              </span>
            </span>
            {showForecast && (
              <span className="text-slate-500">
                Previsto{" "}
                <span
                  className={`font-semibold ${
                    forecastNet >= 0 ? "text-indigo-700" : "text-amber-600"
                  }`}
                >
                  {formatCurrency(forecastNet)}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="p-5">
          <TimelineChart months={report.months} showForecast={showForecast} />
        </div>
        {(report.bestMonth || report.worstMonth) && (
          <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-3 text-sm">
            {report.bestMonth && report.bestMonth.net > 0 && (
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <TrendingUp size={15} className="text-emerald-600" />
                Melhor mês:{" "}
                <span className="font-semibold text-slate-800">
                  {report.bestMonth.label}
                </span>{" "}
                ({formatCurrency(report.bestMonth.net)})
              </span>
            )}
            {report.worstMonth && (
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <TrendingDown size={15} className="text-rose-600" />
                Mês mais apertado:{" "}
                <span className="font-semibold text-slate-800">
                  {report.worstMonth.label}
                </span>{" "}
                ({formatCurrency(report.worstMonth.net)})
              </span>
            )}
          </div>
        )}
      </div>

      {/* ---------- Vencimentos + contas correntes ---------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-900">
                Vencimentos (vencidos e próximos 15 dias)
              </h3>
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
                {alerts.slice(0, 10).map((a) => (
                  <tr key={`${a.kind}-${a.id}`} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {a.kind === "receivable" ? (
                          <ArrowDownCircle size={16} className="shrink-0 text-emerald-600" />
                        ) : (
                          <ArrowUpCircle size={16} className="shrink-0 text-rose-500" />
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
                    <td
                      className="px-5 py-3 text-right font-semibold text-slate-900"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
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
          <div className="flex gap-4 border-t border-slate-100 px-5 py-3">
            <Link
              to="/financeiro/pagar"
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Ver contas a pagar
            </Link>
            <Link
              to="/financeiro/receber"
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              Ver contas a receber
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2 text-slate-900">
            <Landmark size={18} className="text-indigo-500" />
            <h3 className="font-semibold">Contas correntes</h3>
          </div>
          <div className="space-y-2">
            {banks.map((b) => {
              const bal =
                num(b.initial_balance) + num(b.transactions_aggregate.aggregate.sum.amount);
              return (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-600">{b.name}</span>
                  <span
                    className={`shrink-0 font-semibold ${
                      bal >= 0 ? "text-slate-900" : "text-red-600"
                    }`}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(bal)}
                  </span>
                </div>
              );
            })}
            {banks.length === 0 && (
              <p className="text-sm text-slate-400">Nenhuma conta cadastrada.</p>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
            <span className="font-medium text-slate-500">Total</span>
            <span
              className={`font-bold ${balance >= 0 ? "text-slate-900" : "text-red-600"}`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatCurrency(balance)}
            </span>
          </div>
          <Link
            to="/financeiro/contas"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
          >
            Ver extratos
          </Link>
        </div>
      </div>

      {/* ---------- Eventos + categorias ---------- */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white xl:col-span-3">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-900">Eventos no período</h3>
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-5">
            <FinanceTimelineFeed events={report.events} />
          </div>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <PieChart size={18} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-900">Por categoria</h3>
            </div>
            <CategoryBars title="Entradas" slices={report.categoriesIn} color="in" />
            <div className="my-5 border-t border-slate-100" />
            <CategoryBars title="Saídas" slices={report.categoriesOut} color="out" />
          </div>
        </div>
      </div>

      {/* ---------- Resumo mensal (visão em tabela dos gráficos) ---------- */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Table2 size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-900">Resumo mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Mês</th>
                <th className="px-5 py-3 text-right">Entradas</th>
                <th className="px-5 py-3 text-right">Saídas</th>
                <th className="px-5 py-3 text-right">Resultado</th>
                {showForecast && (
                  <>
                    <th className="px-5 py-3 text-right">Prev. entradas</th>
                    <th className="px-5 py-3 text-right">Prev. saídas</th>
                  </>
                )}
                <th className="px-5 py-3 text-right">Saldo acum.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.months.map((m) => (
                <tr key={m.key} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{m.label}</td>
                  <td className="px-5 py-3 text-right text-emerald-700">
                    {formatCurrency(m.inflow)}
                  </td>
                  <td className="px-5 py-3 text-right text-rose-700">
                    {formatCurrency(m.outflow)}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-semibold ${
                      m.net >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {formatCurrency(m.net)}
                  </td>
                  {showForecast && (
                    <>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {formatCurrency(m.forecastIn)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {formatCurrency(m.forecastOut)}
                      </td>
                    </>
                  )}
                  <td className="px-5 py-3 text-right font-semibold text-indigo-700">
                    {formatCurrency(m.cumulative)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
