import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download, Plus, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import { useDebounce } from "@/lib/use-debounce";
import { useCompanyOptions, useUserOptions } from "@/lib/use-options";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { ContatoForm } from "./ContatoForm";
import { ExportModal } from "./ExportModal";
import { ImportModal } from "./ImportModal";

type Contato = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  origin: string | null;
  stage: "new" | "qualified" | "active_client" | "inactive";
  responsibleId: string | null;
  archived?: boolean;
};

type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

const STAGE_OPTIONS = [
  { value: "", label: "Todos os estágios" },
  { value: "new", label: "Novo" },
  { value: "qualified", label: "Qualificado" },
  { value: "active_client", label: "Cliente ativo" },
  { value: "inactive", label: "Inativo" },
];

const STAGE_LABELS: Record<string, { label: string; variant: "info" | "success" | "warning" | "danger" }> = {
  new: { label: "Novo", variant: "info" },
  qualified: { label: "Qualificado", variant: "warning" },
  active_client: { label: "Cliente ativo", variant: "success" },
  inactive: { label: "Inativo", variant: "danger" },
};

const columns: DataTableColumn<Contato>[] = [
  { key: "fullName", header: "Nome" },
  { key: "email", header: "E-mail" },
  { key: "phone", header: "Telefone" },
  { key: "jobTitle", header: "Cargo" },
  {
    key: "stage",
    header: "Estágio",
    render: (row) => {
      const s = STAGE_LABELS[row.stage];
      return s ? <Badge variant={s.variant}>{s.label}</Badge> : row.stage;
    },
  },
];

export function ContatosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const companyOpts = useCompanyOptions();
  const userOpts = useUserOptions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [stage, setStage] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Contato | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contatos", { page, search: debouncedSearch, stage, companyId, responsibleId, showArchived }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (stage) params.stage = stage;
      if (companyId) params.companyId = companyId;
      if (responsibleId) params.responsibleId = responsibleId;
      if (showArchived) (params as any).includeArchived = "true";
      const res = await api.get<{ data: Contato[]; pagination: PaginationMeta }>("/contatos", { params });
      return res.data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/contatos/${id}/restore`),
    onSuccess: () => {
      toast.success("Contato restaurado");
      qc.invalidateQueries({ queryKey: ["contatos"] });
      qc.invalidateQueries({ queryKey: ["contacts-options"] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao restaurar contato", e)),
  });

  const contatos = data?.data ?? [];
  const pagination = data?.pagination;

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Contatos</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setExportOpen(true)}>
            <Download className="size-4" />
            Exportar
          </Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Importar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Novo contato
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          variant="search"
          placeholder="Buscar contato…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          options={STAGE_OPTIONS}
          value={stage}
          onChange={(v) => {
            setStage(v);
            setPage(1);
          }}
          className="max-w-[12rem]"
        />
        <Select
          label="Empresa"
          options={[{ value: "", label: "Todas" }, ...companyOpts]}
          value={companyId}
          onChange={(v) => {
            setCompanyId(v);
            setPage(1);
          }}
          placeholder="Todas"
          className="max-w-[12rem]"
        />
        <Select
          label="Responsável"
          options={[{ value: "", label: "Todos" }, ...userOpts]}
          value={responsibleId}
          onChange={(v) => {
            setResponsibleId(v);
            setPage(1);
          }}
          placeholder="Todos"
          className="max-w-[12rem]"
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
            key: "__archived" as keyof Contato,
            header: "",
            render: (row: Contato) => row.archived ? (
              <div className="flex items-center gap-2">
                <Badge variant="neutral">Arquivado</Badge>
                <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); restoreMutation.mutate(row.id); }}>
                  <RotateCcw className="size-3.5" /> Restaurar
                </Button>
              </div>
            ) : null,
          }] : []),
        ]}
        data={contatos}
        loading={isLoading}
        onRowClick={(row) => navigate(`/contatos/${row.id}`)}
        getRowKey={(row) => row.id}
        emptyMessage="Nenhum contato encontrado."
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-[var(--color-muted)]">
            {page} / {pagination.totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Editar contato" : "Novo contato"}
      >
        <ContatoForm contato={editing} onSuccess={() => setDrawerOpen(false)} />
      </Drawer>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        currentFilters={{ search, stage, companyId, responsibleId }}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["contatos"] });
          qc.invalidateQueries({ queryKey: ["contacts-options"] });
        }}
      />
    </div>
  );
}
