import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { useMemo, type ReactNode } from "react";
import {
  ArrowUpRight,
  Banknote,
  Bell,
  FolderKanban,
  Landmark,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

type PipelineRow = { id: string; name: string };

type FunnelStage = {
  id: string;
  name: string;
  count: number;
  totalValue: string;
};

type FunnelResponse = { stages: FunnelStage[] };

type Paginated<T> = {
  data: T[];
  pagination: { total: number; page: number; perPage: number; totalPages: number };
};

type ReceivableRow = { id: string; value: string; status: string; dueDate: string };
type PayableRow = { id: string; value: string; status: string; dueDate: string };

type ReminderRow = {
  id: string;
  title: string | null;
  reminderDueDate: string | null;
};

type BankRow = {
  id: string;
  name: string;
  currentBalance: string;
};

type ProjectRow = {
  id: string;
  title: string;
  progress: number;
  createdAt: string;
};

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function parseNum(s: string | undefined) {
  const n = Number.parseFloat(s ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="size-9 animate-pulse rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-muted)_18%,transparent)]" />
        <div className="h-4 w-2/5 animate-pulse rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-muted)_22%,transparent)]" />
      </div>
      <div className="mb-3 h-8 w-3/5 animate-pulse rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-muted)_18%,transparent)]" />
      <div className="h-3 w-full animate-pulse rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-muted)_14%,transparent)]" />
    </div>
  );
}

function ClickableWidget({
  title,
  to,
  icon,
  children,
  alert,
  className,
}: {
  title: string;
  to: string;
  icon: ReactNode;
  children: ReactNode;
  alert?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        "group flex w-full flex-col rounded-[var(--radius-xl)] border bg-[var(--color-surface)] p-5 text-left shadow-[var(--shadow-xs)]",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--color-accent)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
        alert
          ? "border-[color-mix(in_srgb,var(--color-danger)_45%,var(--color-border))]"
          : "border-[var(--color-border)]",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] [&_svg]:size-[18px]",
              alert
                ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                : "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
            )}
          >
            {icon}
          </span>
          <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {alert ? <Badge variant="danger">Atenção</Badge> : null}
          <ArrowUpRight className="size-4 text-[var(--color-faint)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </div>
      </div>
      {children}
    </button>
  );
}

function useDueDateTo7d() {
  return useMemo(() => format(addDays(new Date(), 7), "yyyy-MM-dd"), []);
}

function FunnelWidget() {
  const { data: pipelines, isPending: loadingPipelines, isError: pipelinesError, refetch: refetchPipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data } = await api.get<PipelineRow[]>("/pipelines");
      return data;
    },
  });

  const pipelineId = pipelines?.[0]?.id;

  const { data: funnel, isPending: loadingFunnel, isError: funnelError, refetch: refetchFunnel } = useQuery({
    queryKey: ["negocios", "groupByStage", pipelineId],
    queryFn: async () => {
      const { data } = await api.get<FunnelResponse>("/negocios", {
        params: { groupByStage: true, pipelineId },
      });
      return data;
    },
    enabled: Boolean(pipelineId),
  });

  if (loadingPipelines || (pipelineId && loadingFunnel)) {
    return <WidgetSkeleton className="min-h-[180px]" />;
  }

  if (pipelinesError) {
    return <QueryErrorState onRetry={() => refetchPipelines()} />;
  }

  if (funnelError) {
    return <QueryErrorState onRetry={() => refetchFunnel()} />;
  }

  if (!pipelineId) {
    return (
      <ClickableWidget title="Funil de negócios" to="/negocios" icon={<TrendingUp />}>
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
          Cadastre um pipeline para ver o funil aqui.
        </div>
      </ClickableWidget>
    );
  }

  const stages = funnel?.stages ?? [];

  return (
    <ClickableWidget title="Funil de negócios" to="/negocios" icon={<TrendingUp />}>
      <ul className="max-h-44 space-y-1 overflow-y-auto">
        {stages.length === 0 ? (
          <li className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
            Nenhuma etapa.
          </li>
        ) : (
          stages.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-sm transition-colors hover:bg-[var(--color-surface-2)]"
            >
              <span className="truncate text-[var(--color-text)]">{s.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-[var(--color-muted)]">
                <Badge variant="neutral">{s.count}</Badge>
                <span className="tabular-nums">{brl(parseNum(s.totalValue))}</span>
              </span>
            </li>
          ))
        )}
      </ul>
    </ClickableWidget>
  );
}

function ContasReceberWidget({ dueDateTo }: { dueDateTo: string }) {
  const { data: pending, isPending, isError, refetch } = useQuery({
    queryKey: ["contas-receber", "dashboard", "pending", dueDateTo],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ReceivableRow>>("/contas-receber", {
        params: { status: "pending", dueDateTo, perPage: 100 },
      });
      return data;
    },
  });

  const { data: overdueMeta } = useQuery({
    queryKey: ["contas-receber", "dashboard", "overdue"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ReceivableRow>>("/contas-receber", {
        params: { status: "overdue", perPage: 1 },
      });
      return data;
    },
  });

  if (isPending) {
    return <WidgetSkeleton />;
  }

  if (isError) {
    return <QueryErrorState onRetry={() => refetch()} />;
  }

  const rows = pending?.data ?? [];
  const total = pending?.pagination.total ?? 0;
  const sum = rows.reduce((acc, r) => acc + parseNum(r.value), 0);
  const partial = total > rows.length;
  const hasOverdue = (overdueMeta?.pagination.total ?? 0) > 0;

  return (
    <ClickableWidget title="A receber vencendo" to="/contas-receber" icon={<TrendingUp />} alert={hasOverdue}>
      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-semibold leading-none tabular-nums text-[var(--color-text)]">
            {total}
          </p>
          <p
            className={cn(
              "text-sm tabular-nums",
              hasOverdue ? "font-medium text-[var(--color-danger)]" : "text-[var(--color-success)]",
            )}
          >
            {brl(sum)}
          </p>
        </div>
      </div>
      {partial ? (
        <p className="mt-2 text-xs text-[var(--color-faint)]">Valor parcial (até 100 itens)</p>
      ) : null}
    </ClickableWidget>
  );
}

function ContasPagarWidget({ dueDateTo }: { dueDateTo: string }) {
  const { data: pending, isPending, isError, refetch } = useQuery({
    queryKey: ["contas-pagar", "dashboard", "pending", dueDateTo],
    queryFn: async () => {
      const { data } = await api.get<Paginated<PayableRow>>("/contas-pagar", {
        params: { status: "pending", dueDateTo, perPage: 100 },
      });
      return data;
    },
  });

  const { data: overdueMeta } = useQuery({
    queryKey: ["contas-pagar", "dashboard", "overdue"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<PayableRow>>("/contas-pagar", {
        params: { status: "overdue", perPage: 1 },
      });
      return data;
    },
  });

  if (isPending) {
    return <WidgetSkeleton />;
  }

  if (isError) {
    return <QueryErrorState onRetry={() => refetch()} />;
  }

  const rows = pending?.data ?? [];
  const total = pending?.pagination.total ?? 0;
  const sum = rows.reduce((acc, r) => acc + parseNum(r.value), 0);
  const partial = total > rows.length;
  const hasOverdue = (overdueMeta?.pagination.total ?? 0) > 0;

  return (
    <ClickableWidget title="A pagar vencendo" to="/contas-pagar" icon={<TrendingDown />} alert={hasOverdue}>
      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-semibold leading-none tabular-nums text-[var(--color-text)]">
            {total}
          </p>
          <p
            className={cn(
              "text-sm tabular-nums",
              hasOverdue ? "font-medium text-[var(--color-danger)]" : "text-[var(--color-warning)]",
            )}
          >
            {brl(sum)}
          </p>
        </div>
      </div>
      {partial ? (
        <p className="mt-2 text-xs text-[var(--color-faint)]">Valor parcial (até 100 itens)</p>
      ) : null}
    </ClickableWidget>
  );
}

function LembretesWidget() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["lembretes", "dashboard", "pending"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ReminderRow>>("/lembretes", {
        params: { status: "pending", perPage: 3 },
      });
      return data;
    },
  });

  if (isPending) {
    return <WidgetSkeleton className="min-h-[160px]" />;
  }

  if (isError) {
    return <QueryErrorState onRetry={() => refetch()} />;
  }

  const count = data?.pagination.total ?? 0;
  const list = data?.data ?? [];

  return (
    <ClickableWidget title="Lembretes pendentes" to="/lembretes" icon={<Bell />}>
      <p className="mb-3 text-3xl font-semibold leading-none tabular-nums text-[var(--color-text)]">
        {count}
      </p>
      <ul className="space-y-1.5">
        {list.length === 0 ? (
          <li className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] px-4 py-5 text-center text-sm text-[var(--color-muted)]">
            Nenhum lembrete pendente.
          </li>
        ) : (
          list.map((r) => (
            <li
              key={r.id}
              className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
            >
              <span className="block truncate font-medium text-[var(--color-text)]">
                {r.title?.trim() || "Sem título"}
              </span>
              {r.reminderDueDate ? (
                <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                  {format(new Date(r.reminderDueDate), "dd/MM/yyyy HH:mm")}
                </span>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </ClickableWidget>
  );
}

function BancosWidget() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["contas-bancarias"],
    queryFn: async () => {
      const res = await api.get("/contas-bancarias");
      const d = res.data;
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.data)) return d.data;
      return [];
    },
  });

  if (isPending) {
    return <WidgetSkeleton className="min-h-[180px]" />;
  }

  if (isError) {
    return <QueryErrorState onRetry={() => refetch()} />;
  }

  const accounts: BankRow[] = data ?? [];
  const total = accounts.reduce((acc, a) => acc + parseNum(a.currentBalance), 0);

  return (
    <ClickableWidget title="Saldo bancário" to="/contas-bancarias" icon={<Landmark />}>
      <div className="mb-3 flex flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Total
        </span>
        <span
          className={cn(
            "text-2xl font-semibold leading-none tabular-nums",
            total < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text)]",
          )}
        >
          {brl(total)}
        </span>
      </div>
      <ul className="max-h-32 space-y-1 overflow-y-auto">
        {accounts.length === 0 ? (
          <li className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] px-4 py-5 text-center text-sm text-[var(--color-muted)]">
            Nenhuma conta.
          </li>
        ) : (
          accounts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-sm transition-colors hover:bg-[var(--color-surface-2)]"
            >
              <span className="flex min-w-0 items-center gap-2 text-[var(--color-text)]">
                <Banknote className="size-4 shrink-0 text-[var(--color-muted)]" />
                <span className="truncate">{a.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-[var(--color-muted)]">
                {brl(parseNum(a.currentBalance))}
              </span>
            </li>
          ))
        )}
      </ul>
    </ClickableWidget>
  );
}

function ProjetosWidget() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["projetos", "dashboard", "in_progress"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProjectRow>>("/projetos", {
        params: { macroGroup: "in_progress", perPage: 100 },
      });
      return data;
    },
  });

  if (isPending) {
    return <WidgetSkeleton className="min-h-[200px]" />;
  }

  if (isError) {
    return <QueryErrorState onRetry={() => refetch()} />;
  }

  const sorted = [...(data?.data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const top = sorted.slice(0, 3);

  return (
    <ClickableWidget title="Projetos em andamento" to="/projetos" icon={<FolderKanban />}>
      <ul className="space-y-3.5">
        {top.length === 0 ? (
          <li className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
            Nenhum projeto em andamento.
          </li>
        ) : (
          top.map((p) => (
            <li key={p.id}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-[var(--color-text)]">{p.title}</span>
                <span className="shrink-0 tabular-nums text-[var(--color-muted)]">
                  {Math.round(p.progress)}%
                </span>
              </div>
              <ProgressBar value={p.progress} />
            </li>
          ))
        )}
      </ul>
    </ClickableWidget>
  );
}

export default function DashboardPage() {
  const dueDateTo = useDueDateTo7d();

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Visão geral
        </span>
        <h1 className="text-xl font-semibold text-[var(--color-text)] md:text-2xl">Painel</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FunnelWidget />
        <ContasReceberWidget dueDateTo={dueDateTo} />
        <ContasPagarWidget dueDateTo={dueDateTo} />
        <LembretesWidget />
        <BancosWidget />
        <ProjetosWidget />
      </div>
    </div>
  );
}
