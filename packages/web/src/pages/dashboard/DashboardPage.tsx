import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { useMemo, type ReactNode } from "react";
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
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4",
        className,
      )}
    >
      <div className="mb-3 h-4 w-2/5 animate-pulse rounded bg-[color-mix(in_srgb,var(--color-muted)_25%,transparent)]" />
      <div className="mb-2 h-8 w-3/5 animate-pulse rounded bg-[color-mix(in_srgb,var(--color-muted)_18%,transparent)]" />
      <div className="h-3 w-full animate-pulse rounded bg-[color-mix(in_srgb,var(--color-muted)_15%,transparent)]" />
    </div>
  );
}

function ClickableWidget({
  title,
  to,
  children,
  alert,
  className,
}: {
  title: string;
  to: string;
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
        "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left",
        "transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
        alert && "border-[var(--color-red)]",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
        {alert ? <Badge variant="danger">Atenção</Badge> : null}
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
      <ClickableWidget title="Funil de negócios" to="/negocios">
        <p className="text-sm text-[var(--color-muted)]">
          Cadastre um pipeline para ver o funil aqui.
        </p>
      </ClickableWidget>
    );
  }

  const stages = funnel?.stages ?? [];

  return (
    <ClickableWidget title="Funil de negócios" to="/negocios">
      <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
        {stages.length === 0 ? (
          <li className="text-[var(--color-muted)]">Nenhuma etapa.</li>
        ) : (
          stages.map((s) => (
            <li
              key={s.id}
              className="flex justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] pb-2 last:border-0"
            >
              <span className="truncate text-[var(--color-text)]">{s.name}</span>
              <span className="shrink-0 text-[var(--color-muted)]">
                {s.count} · {brl(parseNum(s.totalValue))}
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
    <ClickableWidget title="A receber vencendo" to="/contas-receber" alert={hasOverdue}>
      <p className="text-2xl font-semibold tabular-nums text-[var(--color-text)]">{total}</p>
      <p className={cn("text-sm", hasOverdue ? "text-[var(--color-red)]" : "text-[var(--color-muted)]")}>
        {brl(sum)}
        {partial ? " · valor parcial (até 100 itens)" : ""}
      </p>
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
    <ClickableWidget title="A pagar vencendo" to="/contas-pagar" alert={hasOverdue}>
      <p className="text-2xl font-semibold tabular-nums text-[var(--color-text)]">{total}</p>
      <p className={cn("text-sm", hasOverdue ? "text-[var(--color-red)]" : "text-[var(--color-muted)]")}>
        {brl(sum)}
        {partial ? " · valor parcial (até 100 itens)" : ""}
      </p>
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
    <ClickableWidget title="Lembretes pendentes" to="/lembretes">
      <p className="mb-3 text-2xl font-semibold tabular-nums text-[var(--color-text)]">{count}</p>
      <ul className="space-y-2 text-sm">
        {list.length === 0 ? (
          <li className="text-[var(--color-muted)]">Nenhum lembrete pendente.</li>
        ) : (
          list.map((r) => (
            <li key={r.id} className="truncate text-[var(--color-text)]">
              <span className="font-medium">{r.title?.trim() || "Sem título"}</span>
              {r.reminderDueDate ? (
                <span className="block text-xs text-[var(--color-muted)]">
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
      const { data } = await api.get<{ data: BankRow[] }>("/contas-bancarias");
      return data;
    },
  });

  if (isPending) {
    return <WidgetSkeleton className="min-h-[180px]" />;
  }

  if (isError) {
    return <QueryErrorState onRetry={() => refetch()} />;
  }

  const accounts = data?.data ?? [];
  const total = accounts.reduce((acc, a) => acc + parseNum(a.currentBalance), 0);

  return (
    <ClickableWidget title="Saldo bancário" to="/contas-bancarias">
      <p className="mb-3 text-lg font-semibold tabular-nums text-[var(--color-text)]">
        Total {brl(total)}
      </p>
      <ul className="max-h-32 space-y-1.5 overflow-y-auto text-sm">
        {accounts.length === 0 ? (
          <li className="text-[var(--color-muted)]">Nenhuma conta.</li>
        ) : (
          accounts.map((a) => (
            <li key={a.id} className="flex justify-between gap-2">
              <span className="truncate text-[var(--color-text)]">{a.name}</span>
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
    <ClickableWidget title="Projetos em andamento" to="/projetos">
      <ul className="space-y-3">
        {top.length === 0 ? (
          <li className="text-sm text-[var(--color-muted)]">Nenhum projeto em andamento.</li>
        ) : (
          top.map((p) => (
            <li key={p.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
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
      <h1 className="mb-6 text-2xl font-semibold text-[var(--color-text)]">Painel</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
