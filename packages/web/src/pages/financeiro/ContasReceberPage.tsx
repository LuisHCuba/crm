import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api, extractData, formatMutationError } from "@/lib/api";
import { useCategoryOptions, useCompanyOptions } from "@/lib/use-options";
import { formatCurrency, formatDate } from "@/lib/format";
import { STATUS_FILTER_OPTIONS, STATUS_VARIANT, STATUS_LABEL } from "@/lib/financial-constants";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { ContaReceberForm } from "./ContaReceberForm";

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "warning" | "danger" | "success";
}) {
  const toneClass = {
    warning: "text-[var(--color-warning)]",
    danger: "text-[var(--color-danger)]",
    success: "text-[var(--color-success)]",
  }[tone];
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

type Receivable = {
  id: string;
  description: string;
  companyId: string | null;
  value: string;
  parcelLabel: string | null;
  dueDate: string;
  status: string;
  archived?: boolean;
};

export function ContasReceberPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const companyOpts = useCompanyOptions();
  const categoryOpts = useCategoryOptions("revenue");
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const params: Record<string, string> = { perPage: "100" };
  if (statusFilter) params.status = statusFilter;
  if (companyId) params.companyId = companyId;
  if (categoryId) params.categoryId = categoryId;
  if (dueDateFrom) params.dueDateFrom = dueDateFrom;
  if (dueDateTo) params.dueDateTo = dueDateTo;
  if (showArchived) params.includeArchived = "true";

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/contas-receber/${id}/restore`),
    onSuccess: () => {
      toast.success("Conta restaurada");
      qc.invalidateQueries({ queryKey: ["contas-receber"] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao restaurar conta", e)),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contas-receber", params],
    queryFn: () =>
      api.get("/contas-receber", { params }).then((r) => r.data),
  });

  const { data: empresasRaw } = useQuery({
    queryKey: ["empresas", "all"],
    queryFn: () => api.get("/empresas?perPage=100").then((r) => extractData(r)),
  });

  const companyMap = new Map(
    (empresasRaw ?? []).map((e: { id: string; tradeName?: string | null; legalName: string }) => [e.id, e.tradeName || e.legalName] as const),
  );

  const rows: Receivable[] = data?.data ?? [];
  const totals = data?.totals;

  const columns: DataTableColumn<Receivable>[] = [
    { key: "description", header: "Descrição" },
    {
      key: "companyId",
      header: "Empresa",
      render: (row): React.ReactNode =>
        row.companyId ? companyMap.get(row.companyId) ?? "—" : "—",
    },
    {
      key: "value",
      header: "Valor",
      render: (row) => formatCurrency(row.value),
    },
    {
      key: "parcelLabel",
      header: "Parcela",
      render: (row) => row.parcelLabel ?? "—",
    },
    {
      key: "dueDate",
      header: "Vencimento",
      render: (row) => formatDate(row.dueDate),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "neutral"}>
          {STATUS_LABEL[row.status] ?? row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-success-soft)]"
            aria-hidden
          >
            <ArrowDownCircle className="size-5 text-[var(--color-success)]" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              Contas a receber
            </h1>
            <p className="text-xs text-[var(--color-muted)]">
              Gerencie recebimentos, vencimentos e parcelas.
            </p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Nova conta
        </Button>
      </div>

      {totals && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Pendente" value={formatCurrency(totals.totalPending)} tone="warning" />
          <SummaryCard label="Vencido" value={formatCurrency(totals.totalOverdue)} tone="danger" />
          <SummaryCard label="Recebido" value={formatCurrency(totals.totalPaid)} tone="success" />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]">
        <Select
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          label="Status"
          className="w-40"
        />
        <Select
          label="Empresa"
          options={[{ value: "", label: "Todas" }, ...companyOpts]}
          value={companyId}
          onChange={setCompanyId}
          placeholder="Todas"
          className="w-44"
        />
        <Select
          label="Categoria"
          options={[{ value: "", label: "Todas" }, ...categoryOpts]}
          value={categoryId}
          onChange={setCategoryId}
          placeholder="Todas"
          className="w-44"
        />
        <Input
          label="Vencimento de"
          type="date"
          value={dueDateFrom}
          onChange={(e) => setDueDateFrom(e.target.value)}
          className="w-40"
        />
        <Input
          label="Vencimento até"
          type="date"
          value={dueDateTo}
          onChange={(e) => setDueDateTo(e.target.value)}
          className="w-40"
        />
        <label className="flex h-10 items-center gap-2 text-sm text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="size-4 rounded-[var(--radius-xs)] accent-[var(--color-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          />
          Mostrar arquivados
        </label>
      </div>

      {isError ? (
        <QueryErrorState
          message="Erro ao carregar contas a receber."
          onRetry={() => refetch()}
        />
      ) : (
        <DataTable
          columns={[
            ...columns,
            ...(showArchived ? [{
              key: "__archived" as keyof Receivable,
              header: "",
              render: (row: Receivable) => row.archived ? (
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">Arquivado</Badge>
                  <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); restoreMutation.mutate(row.id); }}>
                    <RotateCcw className="size-3.5" /> Restaurar
                  </Button>
                </div>
              ) : null,
            }] : []),
          ]}
          data={rows}
          loading={isLoading}
          onRowClick={(row) => navigate(`/contas-receber/${row.id}`)}
          getRowKey={(row) => row.id}
          emptyMessage="Nenhuma conta a receber encontrada."
        />
      )}

      <ContaReceberForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
