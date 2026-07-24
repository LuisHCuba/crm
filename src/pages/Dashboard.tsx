import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { gqlClient } from "../lib/graphql";
import { DASHBOARD_QUERY } from "../lib/queries";
import { formatCurrency } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, Skeleton } from "../components/crm/ui";

interface DashboardData {
  contacts_aggregate: { aggregate: { count: number } };
  deals_aggregate: { aggregate: { count: number; sum: { total_value: string | null } } };
  receivables_aggregate: { aggregate: { count: number } };
  paid: { aggregate: { count: number; sum: { received_value: string | null } } };
  pending: { aggregate: { count: number; sum: { value: string | null } } };
}

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => gqlClient.request<DashboardData>(DASHBOARD_QUERY),
  });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do CRM" />
      <div className="p-8">
        {isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
                <Skeleton className="mt-4 h-8 w-16" />
                <Skeleton className="mt-2 h-4 w-28" />
              </div>
            ))}
          </div>
        )}
        {error && (
          <ErrorState
            label="Não foi possível carregar o painel. Verifique sua conexão."
            onRetry={() => refetch()}
          />
        )}
        {data && (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Contatos"
                value={data.contacts_aggregate.aggregate.count.toString()}
                icon={Users}
                color="from-blue-500 to-cyan-500"
              />
              <StatCard
                label="Negócios"
                value={data.deals_aggregate.aggregate.count.toString()}
                hint={formatCurrency(data.deals_aggregate.aggregate.sum.total_value)}
                icon={Briefcase}
                color="from-indigo-500 to-violet-500"
              />
              <StatCard
                label="Recebimentos pagos"
                value={data.paid.aggregate.count.toString()}
                hint={formatCurrency(data.paid.aggregate.sum.received_value)}
                icon={CheckCircle2}
                color="from-emerald-500 to-green-500"
              />
              <StatCard
                label="Recebimentos pendentes"
                value={data.pending.aggregate.count.toString()}
                hint={formatCurrency(data.pending.aggregate.sum.value)}
                icon={Clock}
                color="from-amber-500 to-orange-500"
              />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-center gap-2 text-slate-900">
                  <TrendingUp size={18} className="text-indigo-500" />
                  <h2 className="font-semibold">Recebimentos</h2>
                </div>
                <div className="space-y-4">
                  <ProgressRow
                    label="Pagos"
                    count={data.paid.aggregate.count}
                    total={data.receivables_aggregate.aggregate.count}
                    color="bg-emerald-500"
                  />
                  <ProgressRow
                    label="Pendentes"
                    count={data.pending.aggregate.count}
                    total={data.receivables_aggregate.aggregate.count}
                    color="bg-amber-500"
                  />
                  <div className="border-t border-slate-100 pt-3 text-sm text-slate-500">
                    Total de{" "}
                    <span className="font-semibold text-slate-900">
                      {data.receivables_aggregate.aggregate.count}
                    </span>{" "}
                    recebimentos cadastrados.
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 font-semibold text-slate-900">
                  Resumo financeiro
                </h2>
                <div className="space-y-3">
                  <SummaryRow
                    label="Recebido (pago)"
                    value={formatCurrency(data.paid.aggregate.sum.received_value)}
                    positive
                  />
                  <SummaryRow
                    label="A receber (pendente)"
                    value={formatCurrency(data.pending.aggregate.sum.value)}
                  />
                  <SummaryRow
                    label="Valor total em negócios"
                    value={formatCurrency(data.deals_aggregate.aggregate.sum.total_value)}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Users;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white`}
        >
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

function ProgressRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`font-semibold ${positive ? "text-emerald-600" : "text-slate-900"}`}
      >
        {value}
      </span>
    </div>
  );
}
