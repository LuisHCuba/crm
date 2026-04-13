import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const OBJECT_TYPE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "project", label: "Projeto" },
  { value: "project_task", label: "Tarefa" },
  { value: "project_subtask", label: "Subtarefa" },
  { value: "project_stage", label: "Etapa" },
  { value: "deal", label: "Negócio" },
  { value: "company", label: "Empresa" },
  { value: "contact", label: "Contato" },
  { value: "product", label: "Produto" },
  { value: "activity", label: "Atividade" },
];

const ACTION_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "created", label: "Criado" },
  { value: "updated", label: "Atualizado" },
  { value: "archived", label: "Arquivado" },
  { value: "restored", label: "Restaurado" },
  { value: "stage_changed", label: "Etapa alterada" },
];

const ACTION_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  created: "success",
  updated: "info",
  archived: "danger",
  restored: "warning",
  stage_changed: "info",
};

type AuditRow = {
  id: string;
  createdAt: string;
  userId: string;
  userName: string | null;
  objectType: string;
  recordId: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
};

export function LogPage() {
  const [objectType, setObjectType] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const params: Record<string, string | number> = { page, perPage: 25 };
  if (objectType) params.objectType = objectType;
  if (action) params.action = action;
  if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString();
  if (dateTo) params.dateTo = new Date(dateTo + "T23:59:59").toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", params],
    queryFn: () => api.get("/audit-log", { params }).then((r) => r.data),
  });

  const rows: AuditRow[] = data?.data ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    perPage: 25,
    total: 0,
    totalPages: 1,
  };

  const columns: DataTableColumn<AuditRow>[] = [
    {
      key: "createdAt",
      header: "Data/hora",
      render: (row) =>
        new Date(row.createdAt).toLocaleString("pt-BR"),
    },
    {
      key: "userName",
      header: "Usuário",
      render: (row) => row.userName ?? "—",
    },
    { key: "objectType", header: "Objeto" },
    {
      key: "recordId",
      header: "Registro",
      render: (row) => (
        <span
          className="cursor-pointer truncate text-[var(--color-accent)]"
          title={row.recordId}
        >
          {row.recordId.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: "action",
      header: "Ação",
      render: (row) => (
        <Badge variant={ACTION_VARIANT[row.action] ?? "neutral"}>
          {row.action}
        </Badge>
      ),
    },
    { key: "field", header: "Campo", render: (row) => row.field ?? "—" },
    {
      key: "oldValue",
      header: "Anterior",
      render: (row) => (
        <span className="max-w-[120px] truncate" title={row.oldValue ?? ""}>
          {row.oldValue ?? "—"}
        </span>
      ),
    },
    {
      key: "newValue",
      header: "Novo",
      render: (row) => (
        <span className="max-w-[120px] truncate" title={row.newValue ?? ""}>
          {row.newValue ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">
        Log de auditoria
      </h1>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Objeto"
          options={OBJECT_TYPE_OPTIONS}
          value={objectType}
          onChange={(v) => {
            setObjectType(v);
            setPage(1);
          }}
          className="w-44"
        />
        <Select
          label="Ação"
          options={ACTION_OPTIONS}
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          className="w-44"
        />
        <Input
          type="date"
          label="De"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-40"
        />
        <Input
          type="date"
          label="Até"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-40"
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        getRowKey={(row) => row.id}
      />

      <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          Página {pagination.page} de {pagination.totalPages} ({pagination.total}{" "}
          registros)
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
