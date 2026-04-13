import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api, extractData } from "@/lib/api";
import { useUserOptions } from "@/lib/use-options";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjetoForm } from "./ProjetoForm";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "not_started", label: "Não iniciado" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
  { value: "overdue", label: "Atrasado" },
];

const STATUS_LABEL: Record<string, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  completed: "Concluído",
  overdue: "Atrasado",
};

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  not_started: "neutral",
  in_progress: "info",
  completed: "success",
  overdue: "danger",
};

type Project = {
  id: string;
  title: string;
  dealId: string | null;
  plannedEndDate: string | null;
  progress: number;
  status: string;
  taskCount: number;
};

export function ProjetosPage() {
  const navigate = useNavigate();
  const userOpts = useUserOptions();
  const [statusFilter, setStatusFilter] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const params: Record<string, string> = {};
  if (statusFilter) params.macroGroup = statusFilter;
  if (responsibleId) params.responsibleId = responsibleId;

  const { data, isLoading } = useQuery({
    queryKey: ["projects", params],
    queryFn: () =>
      api
        .get("/projetos", { params })
        .then((r) => extractData<Project>(r)),
  });

  const columns: DataTableColumn<Project>[] = [
    { key: "title", header: "Título" },
    {
      key: "dealId",
      header: "Negócio",
      render: (row) =>
        row.dealId ? (
          <span className="text-[var(--color-accent)]">Vinculado</span>
        ) : (
          "—"
        ),
    },
    {
      key: "progress",
      header: "Progresso",
      render: (row) => (
        <div className="flex items-center gap-2">
          <ProgressBar
            value={row.progress}
            className="w-20"
            color={row.progress >= 100 ? "green" : "accent"}
          />
          <span className="text-xs text-[var(--color-muted)]">
            {Math.round(row.progress)}%
          </span>
        </div>
      ),
    },
    {
      key: "plannedEndDate",
      header: "Prazo",
      render: (row) =>
        row.plannedEndDate
          ? new Date(row.plannedEndDate).toLocaleDateString("pt-BR")
          : "—",
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Projetos
        </h1>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus className="size-4" /> Novo projeto
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Filtrar status"
          className="w-48"
        />
        <Select
          label="Responsável"
          options={[{ value: "", label: "Todos" }, ...userOpts]}
          value={responsibleId}
          onChange={setResponsibleId}
          placeholder="Todos"
          className="w-48"
        />
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/projetos/${row.id}`)}
      />

      <ProjetoForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
