import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../../../lib/graphql";
import { ProductForm } from "../ProductForm";
import {
  ADD_DEAL_LINE_ITEM,
  DELETE_DEAL_LINE_ITEM,
  UPDATE_DEAL_DETAIL,
  UPDATE_DEAL_LINE_ITEM,
  type DealLineItemFull,
} from "../../../lib/queries/deal-detail";
import {
  fetchProductOption,
  searchProducts,
  type SearchOption,
} from "../../../lib/entity-search";
import { formatCurrency } from "../../../lib/format";
import { logActivity } from "../../../lib/activity-log";
import { computeSubtotal } from "../labels";
import { SearchSelect } from "../SearchSelect";
import { Modal, SubmitButton, fieldInputClass } from "../ui";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function CollapsibleHeader({
  count,
  open,
  onToggle,
  action,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"
      >
        <ChevronDown
          size={15}
          className={`text-slate-400 transition ${open ? "" : "-rotate-90"}`}
        />
        Itens de linha <span className="text-slate-400">({count})</span>
      </button>
      {action}
    </header>
  );
}

export function LineItemsCard({
  dealId,
  dealTotal,
  items,
  onChanged,
}: {
  dealId: string;
  /** Valor atual do negócio (para detectar valor definido manualmente). */
  dealTotal: number;
  items: DealLineItemFull[];
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const total = useMemo(
    () => round2(items.reduce((sum, it) => sum + Number(it.subtotal), 0)),
    [items]
  );

  // Só sobrescreve o valor do negócio sem perguntar quando ele já era a
  // soma dos itens. Um valor digitado à mão nunca é destruído em silêncio.
  const totalIsDerived = Math.abs(dealTotal - total) < 0.01;
  const confirmSync = (newTotal: number) =>
    totalIsDerived ||
    confirm(
      `O valor do negócio (${formatCurrency(dealTotal)}) foi definido manualmente e difere da soma dos itens. Recalcular para ${formatCurrency(newTotal)}?`
    );

  const syncTotal = (newTotal: number) =>
    gqlClient.request(UPDATE_DEAL_DETAIL, {
      id: dealId,
      set: { total_value: round2(newTotal) },
    });

  const afterChange = () => {
    onChanged();
    queryClient.invalidateQueries({ queryKey: ["deals-board"] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (item: DealLineItemFull) => {
      const newTotal = round2(total - Number(item.subtotal));
      const sync = confirmSync(newTotal);
      await gqlClient.request(DELETE_DEAL_LINE_ITEM, { id: item.id });
      if (sync) await syncTotal(newTotal);
      await logActivity({
        title: `Item removido: ${item.product?.name ?? "Produto"}`,
        body: sync
          ? `Novo total do negócio: ${formatCurrency(newTotal)}`
          : undefined,
        link: { dealId },
      });
    },
    onSuccess: () => {
      afterChange();
      toast.success("Item removido");
    },
    onError: () => toast.error("Erro ao remover item"),
  });

  const updateMutation = useMutation({
    mutationFn: async (vars: {
      item: DealLineItemFull;
      quantity: number;
      unit_price: number;
      discount_percent: number;
    }) => {
      const subtotal = computeSubtotal(
        vars.quantity,
        vars.unit_price,
        vars.discount_percent
      );
      const newTotal = round2(total - Number(vars.item.subtotal) + subtotal);
      const sync = confirmSync(newTotal);
      await gqlClient.request(UPDATE_DEAL_LINE_ITEM, {
        id: vars.item.id,
        set: {
          quantity: vars.quantity,
          unit_price: vars.unit_price,
          discount_percent: vars.discount_percent,
          subtotal,
        },
      });
      if (sync) await syncTotal(newTotal);
      await logActivity({
        title: `Item atualizado: ${vars.item.product?.name ?? "Produto"}`,
        body: `${vars.quantity} × ${formatCurrency(vars.unit_price)}${
          sync ? ` · Novo total: ${formatCurrency(newTotal)}` : ""
        }`,
        link: { dealId },
      });
    },
    onSuccess: () => {
      afterChange();
      setEditingId(null);
      toast.success("Item atualizado");
    },
    onError: () => toast.error("Erro ao atualizar item"),
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <CollapsibleHeader
        count={items.length}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        action={
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
            title="Adicionar item"
          >
            <Plus size={14} /> Adicionar
          </button>
        }
      />
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-slate-400">
              <Package size={20} />
              Nenhum produto neste negócio.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it) =>
                editingId === it.id ? (
                  <EditRow
                    key={it.id}
                    item={it}
                    saving={updateMutation.isPending}
                    onCancel={() => setEditingId(null)}
                    onSave={(q, p, d) =>
                      updateMutation.mutate({
                        item: it,
                        quantity: q,
                        unit_price: p,
                        discount_percent: d,
                      })
                    }
                  />
                ) : (
                  <div
                    key={it.id}
                    className="group rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <Package size={15} className="text-slate-400" />
                        {it.product?.name ?? "Produto"}
                        {it.product?.sku && (
                          <span className="text-xs text-slate-400">
                            ({it.product.sku})
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingId(it.id)}
                          className="rounded p-1 text-slate-300 opacity-0 transition hover:text-indigo-600 group-hover:opacity-100"
                          title="Editar item"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(it)}
                          disabled={deleteMutation.isPending}
                          className="rounded p-1 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                          title="Remover item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between pl-[23px] text-xs text-slate-500">
                      <span>
                        {it.quantity} × {formatCurrency(it.unit_price)}
                        {Number(it.discount_percent ?? 0) > 0 &&
                          ` · -${Number(it.discount_percent)}%`}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(it.subtotal)}
                      </span>
                    </div>
                  </div>
                )
              )}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-medium text-slate-500">Total</span>
                <span className="text-base font-bold text-indigo-700">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {adding && (
        <AddLineItemModal
          dealId={dealId}
          currentTotal={total}
          dealTotal={dealTotal}
          onClose={() => setAdding(false)}
          onSaved={afterChange}
        />
      )}
    </section>
  );
}

function EditRow({
  item,
  saving,
  onSave,
  onCancel,
}: {
  item: DealLineItemFull;
  saving: boolean;
  onSave: (quantity: number, unitPrice: number, discount: number) => void;
  onCancel: () => void;
}) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [unitPrice, setUnitPrice] = useState(Number(item.unit_price));
  const [discount, setDiscount] = useState(Number(item.discount_percent ?? 0));
  const subtotal = computeSubtotal(quantity, unitPrice, discount);

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 px-3 py-2">
      <p className="mb-2 text-sm font-medium text-slate-800">
        {item.product?.name ?? "Produto"}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-slate-500">
          Qtd
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className={`${fieldInputClass} mt-0.5`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Preço un.
          <input
            type="number"
            min="0"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value)))}
            className={`${fieldInputClass} mt-0.5`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Desc. %
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={discount}
            onChange={(e) =>
              setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))
            }
            className={`${fieldInputClass} mt-0.5`}
          />
        </label>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-700">
          {formatCurrency(subtotal)}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onSave(quantity, unitPrice, discount)}
            disabled={saving}
            className="rounded p-1.5 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
            title="Salvar"
          >
            <Check size={15} />
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100"
            title="Cancelar"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddLineItemModal({
  dealId,
  currentTotal,
  dealTotal,
  onClose,
  onSaved,
}: {
  dealId: string;
  /** Soma dos itens existentes. */
  currentTotal: number;
  /** Valor atual do negócio (pode ter sido definido manualmente). */
  dealTotal: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [product, setProduct] = useState<SearchOption | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [creatingProduct, setCreatingProduct] = useState(false);

  const subtotal = computeSubtotal(quantity, unitPrice, discount);

  const applyProduct = (opt: SearchOption | null) => {
    setProduct(opt);
    const price = opt?.meta?.base_price;
    if (price != null) setUnitPrice(Number(price));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const newTotal = round2(currentTotal + subtotal);
      // Valor manual (diferente da soma dos itens) só é sobrescrito com aval.
      const sync =
        Math.abs(dealTotal - currentTotal) < 0.01 ||
        confirm(
          `O valor do negócio (${formatCurrency(dealTotal)}) foi definido manualmente e difere da soma dos itens. Recalcular para ${formatCurrency(newTotal)}?`
        );
      await gqlClient.request(ADD_DEAL_LINE_ITEM, {
        obj: {
          deal_id: dealId,
          product_id: product!.id,
          quantity,
          unit_price: unitPrice,
          discount_percent: discount,
          subtotal,
        },
      });
      if (sync) {
        await gqlClient.request(UPDATE_DEAL_DETAIL, {
          id: dealId,
          set: { total_value: newTotal },
        });
      }
      const productName = product?.label ?? "Produto";
      await logActivity({
        title: `Item adicionado: ${productName}`,
        body: `${quantity} × ${formatCurrency(unitPrice)}${
          sync ? ` · Novo total: ${formatCurrency(newTotal)}` : ""
        }`,
        link: { dealId },
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
    if (!product) {
      toast.error("Selecione um produto");
      return;
    }
    if (quantity < 1) {
      toast.error("Quantidade inválida");
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal title="Adicionar item de linha" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">
              Produto<span className="text-red-500"> *</span>
            </label>
            <button
              type="button"
              onClick={() => setCreatingProduct(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
              title="Criar produto"
            >
              <Plus size={13} /> Criar produto
            </button>
          </div>
          <SearchSelect
            value={product}
            onChange={applyProduct}
            loadOptions={searchProducts}
            placeholder="Buscar produto..."
            searchPlaceholder="Nome ou SKU..."
            allowClear={false}
          />
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
              onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value)))}
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
              onChange={(e) =>
                setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))
              }
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

      {creatingProduct && (
        <ProductForm
          onClose={() => setCreatingProduct(false)}
          onSaved={(newId) => {
            if (!newId) return;
            // Seleciona o produto recém-criado (herdando o preço base).
            fetchProductOption(newId).then((opt) => {
              if (opt) applyProduct(opt);
            });
          }}
        />
      )}
    </Modal>
  );
}
