import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  ADD_LINE_ITEM,
  DELETE_LINE_ITEM,
  PRODUCTS_MINI,
  UPDATE_DEAL,
  type LineItem,
} from "../../lib/queries/crm";
import { formatCurrency } from "../../lib/format";
import { computeSubtotal } from "./labels";
import { Modal, SubmitButton, fieldInputClass } from "./ui";

interface ProductMini {
  id: string;
  name: string;
  sku: string | null;
  base_price: string;
  unit: string;
}

export function LineItems({
  dealId,
  items,
  onChanged,
}: {
  dealId: string;
  items: LineItem[];
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.subtotal), 0),
    [items]
  );

  const recalcDealTotal = (newTotal: number) =>
    gqlClient.request(UPDATE_DEAL, {
      id: dealId,
      set: { total_value: newTotal },
    });

  const deleteMutation = useMutation({
    mutationFn: async (item: LineItem) => {
      await gqlClient.request(DELETE_LINE_ITEM, { id: item.id });
      const newTotal = total - Number(item.subtotal);
      await recalcDealTotal(Math.round(newTotal * 100) / 100);
    },
    onSuccess: () => {
      onChanged();
      queryClient.invalidateQueries({ queryKey: ["deals-board"] });
      toast.success("Item removido");
    },
    onError: () => toast.error("Erro ao remover item"),
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Itens de linha
        </h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
        >
          <Plus size={14} /> Adicionar
        </button>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-slate-400">
          <Package size={22} />
          Nenhum produto adicionado a este negócio.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2">Produto</th>
              <th className="px-4 py-2 text-center">Qtd</th>
              <th className="px-4 py-2 text-right">Preço un.</th>
              <th className="px-4 py-2 text-right">Desc.</th>
              <th className="px-4 py-2 text-right">Subtotal</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it) => (
              <tr key={it.id} className="group">
                <td className="px-4 py-2.5 font-medium text-slate-800">
                  {it.product?.name ?? "Produto"}
                  {it.product?.sku && (
                    <span className="ml-1 text-xs text-slate-400">
                      ({it.product.sku})
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center text-slate-600">
                  {it.quantity}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600">
                  {formatCurrency(it.unit_price)}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600">
                  {Number(it.discount_percent ?? 0)}%
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                  {formatCurrency(it.subtotal)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(it)}
                    className="rounded p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                    title="Remover"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200">
              <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-slate-500">
                Total do negócio
              </td>
              <td className="px-4 py-3 text-right text-base font-bold text-indigo-700">
                {formatCurrency(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}

      {adding && (
        <AddLineItemModal
          dealId={dealId}
          currentTotal={total}
          onClose={() => setAdding(false)}
          onSaved={() => {
            onChanged();
            queryClient.invalidateQueries({ queryKey: ["deals-board"] });
          }}
        />
      )}
    </div>
  );
}

function AddLineItemModal({
  dealId,
  currentTotal,
  onClose,
  onSaved,
}: {
  dealId: string;
  currentTotal: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data } = useQuery({
    queryKey: ["products-mini"],
    queryFn: () => gqlClient.request<{ products: ProductMini[] }>(PRODUCTS_MINI),
  });
  const products = data?.products ?? [];

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discount, setDiscount] = useState(0);

  const subtotal = computeSubtotal(quantity, unitPrice, discount);

  const mutation = useMutation({
    mutationFn: async () => {
      await gqlClient.request(ADD_LINE_ITEM, {
        obj: {
          deal_id: dealId,
          product_id: productId,
          quantity,
          unit_price: unitPrice,
          discount_percent: discount,
          subtotal,
        },
      });
      const newTotal = Math.round((currentTotal + subtotal) * 100) / 100;
      await gqlClient.request(UPDATE_DEAL, {
        id: dealId,
        set: { total_value: newTotal },
      });
    },
    onSuccess: () => {
      toast.success("Item adicionado");
      onSaved();
      onClose();
    },
    onError: () => toast.error("Erro ao adicionar item"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Selecione um produto");
      return;
    }
    mutation.mutate();
  };

  const onSelectProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setUnitPrice(Number(p.base_price));
  };

  return (
    <Modal title="Adicionar item de linha" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Produto<span className="text-red-500"> *</span>
          </label>
          <select
            value={productId}
            onChange={(e) => onSelectProduct(e.target.value)}
            className={fieldInputClass}
            required
          >
            <option value="">Selecione...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.sku ? ` (${p.sku})` : ""} — {formatCurrency(p.base_price)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Quantidade
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Preço unitário
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Desconto (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className={fieldInputClass}
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-500">Subtotal</span>
          <span className="text-lg font-bold text-indigo-700">
            {formatCurrency(subtotal)}
          </span>
        </div>
        <SubmitButton loading={mutation.isPending}>Adicionar item</SubmitButton>
      </form>
    </Modal>
  );
}
