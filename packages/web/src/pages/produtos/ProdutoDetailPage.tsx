import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Archive } from "lucide-react";
import { AuditHistory } from "@/components/AuditHistory";
import { api, extractPaginated, formatMutationError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Tabs } from "@/components/ui/Tabs";
import { PropertyField } from "@/components/ui/PropertyField";
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
  createdAt: string;
};

type Deal = {
  id: string;
  title: string;
  value: string | null;
  createdAt: string;
};

const TABS = [
  { id: "Negócios", label: "Negócios" },
  { id: "Histórico", label: "Histórico" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const dealCols: DataTableColumn<Deal>[] = [
  { key: "title", header: "Título" },
  { key: "value", header: "Valor" },
  { key: "createdAt", header: "Criado em", render: (r) => new Date(r.createdAt).toLocaleDateString("pt-BR") },
];

export function ProdutoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("Negócios");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: produto, isLoading, isError, refetch } = useQuery({
    queryKey: ["produto", id],
    queryFn: async () => {
      const res = await api.get<Produto>(`/produtos/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const dealsQuery = useQuery({
    queryKey: ["produto", id, "negocios"],
    queryFn: async () => {
      const res = await api.get("/negocios", { params: { productId: id, perPage: 100 } });
      return extractPaginated<Deal>(res).data;
    },
    enabled: tab === "Negócios" && !!id,
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.delete(`/produtos/${id}`),
    onSuccess: () => {
      toast.success("Produto arquivado");
      qc.invalidateQueries({ queryKey: ["produtos"] });
      navigate("/produtos");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao arquivar produto", e)),
  });

  const backLink = (
    <Link
      to="/produtos"
      aria-label="Voltar para produtos"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-muted)] outline-none transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
    >
      <ArrowLeft className="size-5" />
    </Link>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          {backLink}
          <div className="h-6 w-48 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-2)]" />
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-xs)]">
          <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">{backLink}</div>
        <QueryErrorState
          message="Não foi possível carregar o produto."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">{backLink}</div>
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center text-sm text-[var(--color-muted)]">
          Produto não encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-3">
        {backLink}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl">
              {produto.name}
            </h1>
            {produto.active ? (
              <Badge variant="success">Ativo</Badge>
            ) : (
              <Badge variant="danger">Inativo</Badge>
            )}
          </div>
          {produto.sku && (
            <span className="text-sm text-[var(--color-muted)]">SKU: {produto.sku}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button
            variant="danger"
            onClick={() => archiveMutation.mutate()}
            loading={archiveMutation.isPending}
          >
            <Archive className="size-4" /> Arquivar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-4">
          <Tabs
            tabs={TABS as unknown as { id: string; label: string }[]}
            activeTab={tab}
            onChange={(id) => setTab(id as Tab)}
          />

          {tab === "Negócios" &&
            (dealsQuery.isError ? (
              <QueryErrorState
                message="Não foi possível carregar os negócios."
                onRetry={() => dealsQuery.refetch()}
              />
            ) : (
              <DataTable
                columns={dealCols}
                data={dealsQuery.data ?? []}
                loading={dealsQuery.isLoading}
                onRowClick={(r) => navigate(`/negocios/${r.id}`)}
                getRowKey={(r) => r.id}
                emptyMessage="Nenhum negócio vinculado."
              />
            ))}

          {tab === "Histórico" && id && (
            <AuditHistory objectType="product" recordId={id} />
          )}
        </div>

        <aside className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)] lg:self-start">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Detalhes</h2>
          <div className="flex flex-col gap-4">
            <PropertyField label="Descrição" value={produto.description} />
            <PropertyField
              label="Preço base"
              value={Number(produto.basePrice).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            />
            <PropertyField label="Unidade" value={produto.unit} />
            <PropertyField
              label="Criado em"
              value={new Date(produto.createdAt).toLocaleDateString("pt-BR")}
            />
          </div>
        </aside>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Editar produto">
        <ProdutoForm produto={produto} onSuccess={() => setDrawerOpen(false)} />
      </Drawer>
    </div>
  );
}
