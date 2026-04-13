import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { EmpresaForm } from "./EmpresaForm";

type Empresa = {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: "client" | "supplier" | "both";
  responsibleId: string | null;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
};

type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

const TYPE_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "client", label: "Cliente" },
  { value: "supplier", label: "Fornecedor" },
  { value: "both", label: "Ambos" },
];

const TYPE_LABELS: Record<string, { label: string; variant: "info" | "warning" | "success" }> = {
  client: { label: "Cliente", variant: "info" },
  supplier: { label: "Fornecedor", variant: "warning" },
  both: { label: "Ambos", variant: "success" },
};

const columns: DataTableColumn<Empresa>[] = [
  { key: "legalName", header: "Razão social" },
  { key: "tradeName", header: "Nome fantasia" },
  { key: "document", header: "CNPJ" },
  {
    key: "type",
    header: "Tipo",
    render: (row) => {
      const t = TYPE_LABELS[row.type];
      return t ? <Badge variant={t.variant}>{t.label}</Badge> : row.type;
    },
  },
  { key: "phone", header: "Telefone" },
  { key: "responsibleId", header: "Responsável" },
];

export function EmpresasPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["empresas", { page, search, type, showArchived }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: 20 };
      if (search) params.search = search;
      if (type) params.type = type;
      if (showArchived) (params as any).includeArchived = "true";
      const res = await api.get<{ data: Empresa[]; pagination: PaginationMeta }>("/empresas", { params });
      return res.data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/empresas/${id}/restore`),
    onSuccess: () => {
      toast.success("Empresa restaurada");
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["companies-options"] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao restaurar empresa", e)),
  });

  const empresas = data?.data ?? [];
  const pagination = data?.pagination;

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(empresa: Empresa) {
    setEditing(empresa);
    setDrawerOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Empresas</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nova empresa
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          variant="search"
          placeholder="Buscar empresa…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          options={TYPE_OPTIONS}
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
          className="max-w-[10rem]"
        />
        <label className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => { setShowArchived(e.target.checked); setPage(1); }}
            className="accent-[var(--color-accent)]"
          />
          Mostrar arquivados
        </label>
      </div>

      <DataTable
        columns={[
          ...columns,
          ...(showArchived ? [{
            key: "__archived" as keyof Empresa,
            header: "",
            render: (row: Empresa) => row.archived ? (
              <div className="flex items-center gap-2">
                <Badge variant="neutral">Arquivado</Badge>
                <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); restoreMutation.mutate(row.id); }}>
                  <RotateCcw className="size-3.5" /> Restaurar
                </Button>
              </div>
            ) : null,
          }] : []),
        ]}
        data={empresas}
        loading={isLoading}
        onRowClick={(row) => navigate(`/empresas/${row.id}`)}
        getRowKey={(row) => row.id}
        emptyMessage="Nenhuma empresa encontrada."
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-[var(--color-muted)]">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Editar empresa" : "Nova empresa"}
      >
        <EmpresaForm
          empresa={editing}
          onSuccess={() => setDrawerOpen(false)}
        />
      </Drawer>
    </div>
  );
}
