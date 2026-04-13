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
import { ContaReceberForm } from "./ContaReceberForm";

type Receivable = {
  id: string;
  description: string;
  companyId: string;
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

  const { data, isLoading } = useQuery({
    queryKey: ["contas-receber", params],
    queryFn: () =>
      api.get("/contas-receber", { params }).then((r) => r.data),
  });

  const { data: empresasRaw } = useQuery({
    queryKey: ["empresas", "all"],
    queryFn: () => api.get("/empresas?perPage=100").then((r) => extractData(r)),
  });

  const companyMap = new Map(
    (empresasRaw ?? []).map((e: any) => [e.id, e.tradeName || e.legalName] as const),
  );

  const rows: Receivable[] = data?.data ?? [];
  const totals = data?.totals;

  const columns: DataTableColumn<Receivable>[] = [
    { key: "description", header: "Descrição" },
    {
      key: "companyId",
      header: "Empresa",
      render: (row): React.ReactNode => companyMap.get(row.companyId) ?? "—",
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ArrowDownCircle className="size-6 text-[var(--color-green)]" />
          <h1 className="text-xl font-bold text-[var(--color-text)]">
            Contas a receber
          </h1>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Nova conta
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
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
        <label className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Mostrar arquivados
        </label>
      </div>

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
      />

      {totals && (
        <div className="flex flex-wrap gap-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm">
          <div>
            <span className="text-[var(--color-muted)]">Pendente: </span>
            <span className="font-semibold text-[var(--color-yellow)]">
              {formatCurrency(totals.totalPending)}
            </span>
          </div>
          <div>
            <span className="text-[var(--color-muted)]">Vencido: </span>
            <span className="font-semibold text-[var(--color-red)]">
              {formatCurrency(totals.totalOverdue)}
            </span>
          </div>
          <div>
            <span className="text-[var(--color-muted)]">Recebido: </span>
            <span className="font-semibold text-[var(--color-green)]">
              {formatCurrency(totals.totalPaid)}
            </span>
          </div>
        </div>
      )}

      <ContaReceberForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
