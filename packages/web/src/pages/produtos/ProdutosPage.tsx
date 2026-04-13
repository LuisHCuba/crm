import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import { useDebounce } from "@/lib/use-debounce";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { ProdutoForm } from "./ProdutoForm";

type Produto = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  basePrice: string;
  unit: string;
  active: boolean;
  archived?: boolean;
};

type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

const ACTIVE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "true", label: "Ativos" },
  { value: "false", label: "Inativos" },
];

const columns: DataTableColumn<Produto>[] = [
  { key: "name", header: "Nome" },
  { key: "sku", header: "SKU" },
  {
    key: "basePrice",
    header: "Preço",
    render: (row) =>
      Number(row.basePrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  },
  { key: "unit", header: "Unidade" },
  {
    key: "active",
    header: "Status",
    render: (row) =>
      row.active ? (
        <Badge variant="success">Ativo</Badge>
      ) : (
        <Badge variant="danger">Inativo</Badge>
      ),
  },
];

export function ProdutosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [active, setActive] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["produtos", { page, search: debouncedSearch, active, showArchived }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (active) params.active = active;
      if (showArchived) (params as any).includeArchived = "true";
      const res = await api.get<{ data: Produto[]; pagination: PaginationMeta }>("/produtos", { params });
      return res.data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/produtos/${id}/restore`),
    onSuccess: () => {
      toast.success("Produto restaurado");
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["products-options"] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao restaurar produto", e)),
  });

  const produtos = data?.data ?? [];
  const pagination = data?.pagination;

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Produtos</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Novo produto
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          variant="search"
          placeholder="Buscar produto…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          options={ACTIVE_OPTIONS}
          value={active}
          onChange={(v) => {
            setActive(v);
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
            key: "__archived" as keyof Produto,
            header: "",
            render: (row: Produto) => row.archived ? (
              <div className="flex items-center gap-2">
                <Badge variant="neutral">Arquivado</Badge>
                <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); restoreMutation.mutate(row.id); }}>
                  <RotateCcw className="size-3.5" /> Restaurar
                </Button>
              </div>
            ) : null,
          }] : []),
        ]}
        data={produtos}
        loading={isLoading}
        onRowClick={(row) => navigate(`/produtos/${row.id}`)}
        getRowKey={(row) => row.id}
        emptyMessage="Nenhum produto encontrado."
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
        title={editing ? "Editar produto" : "Novo produto"}
      >
        <ProdutoForm produto={editing} onSuccess={() => setDrawerOpen(false)} />
      </Drawer>
    </div>
  );
}
