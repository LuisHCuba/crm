import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Search, Package } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  ARCHIVE_PRODUCT,
  PRODUCTS_LIST,
  type Product,
} from "../lib/queries/crm";
import { formatCurrency } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { ProductForm } from "../components/crm/ProductForm";
import { Badge, EmptyState, ErrorState, Loading } from "../components/crm/ui";

export default function Products() {
  const queryClient = useQueryClient();
  const [formProduct, setFormProduct] = useState<Product | null | undefined>(
    undefined
  );
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => gqlClient.request<{ products: Product[] }>(PRODUCTS_LIST),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => gqlClient.request(ARCHIVE_PRODUCT, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto arquivado");
    },
    onError: () => toast.error("Erro ao arquivar produto"),
  });

  const filtered = useMemo(() => {
    const list = data?.products ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["products"] });

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Produtos"
        subtitle={data ? `${data.products.length} produtos` : "Carregando..."}
        action={
          <button
            onClick={() => setFormProduct(null)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={16} /> Novo produto
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-8">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {isLoading && <Loading />}
        {error && <ErrorState label="Erro ao carregar produtos." />}

        {data && filtered.length === 0 && (
          <EmptyState
            icon={<Package size={22} />}
            title="Nenhum produto no catálogo"
            description="Cadastre produtos para usar nos itens de linha dos negócios."
            action={
              <button
                onClick={() => setFormProduct(null)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} /> Novo produto
              </button>
            }
          />
        )}

        {data && filtered.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Unidade</th>
                  <th className="px-5 py-3 text-right">Preço base</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      {p.description && (
                        <p className="max-w-md truncate text-xs text-slate-500">
                          {p.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{p.sku || "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{p.unit}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(p.base_price)}
                    </td>
                    <td className="px-5 py-3">
                      {p.active ? (
                        <Badge className="bg-emerald-50 text-emerald-700">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500">
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => setFormProduct(p)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => archiveMutation.mutate(p.id)}
                          disabled={archiveMutation.isPending}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Arquivar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {formProduct !== undefined && (
        <ProductForm
          product={formProduct ?? undefined}
          onClose={() => setFormProduct(undefined)}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}
