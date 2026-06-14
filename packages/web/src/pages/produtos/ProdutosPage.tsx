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
import { QueryErrorState } from "@/components/ui/QueryErrorState";
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["produtos", { page, search: debouncedSearch, active, showArchived }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, perPage: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (active) params.active = active;
      if (showArchived) params.includeArchived = "true";
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

  const archivedColumn: DataTableColumn<Produto> = {
    key: "__archived",
    header: "",
    render: (row: Produto) =>
      row.archived ? (
        <div className="flex items-center justify-end gap-2">
          <Badge variant="neutral">Arquivado</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              restoreMutation.mutate(row.id);
            }}
          >
            <RotateCcw className="size-3.5" /> Restaurar
          </Button>
        </div>
      ) : null,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl">Produtos</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Gerencie o catálogo de produtos e serviços.
            {pagination ? (
              <span className="text-[var(--color-faint)]"> · {pagination.total} no total</span>
            ) : null}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Novo produto
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)] sm:flex-row sm:flex-wrap sm:items-end">
        <Input
          variant="search"
          placeholder="Buscar produto…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full sm:max-w-xs"
        />
        <Select
          options={ACTIVE_OPTIONS}
          value={active}
          onChange={(v) => {
            setActive(v);
            setPage(1);
          }}
          className="w-full sm:max-w-[10rem]"
        />
        <label className="flex h-10 cursor-pointer select-none items-center gap-2 rounded-[var(--radius-lg)] px-1 text-sm text-[var(--color-muted)] sm:ml-auto">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => {
              setShowArchived(e.target.checked);
              setPage(1);
            }}
            className="size-4 rounded-[var(--radius-xs)] accent-[var(--color-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          />
          Mostrar arquivados
        </label>
      </div>

      {isError ? (
        <QueryErrorState
          message="Não foi possível carregar os produtos."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={[...columns, ...(showArchived ? [archivedColumn] : [])]}
            data={produtos}
            loading={isLoading}
            onRowClick={(row) => navigate(`/produtos/${row.id}`)}
            getRowKey={(row) => row.id}
            emptyMessage="Nenhum produto encontrado."
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 sm:justify-center">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-[var(--color-muted)]">
                Página {page} de {pagination.totalPages}
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
        </>
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
