import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import { useBankAccountOptions, useCategoryOptions } from "@/lib/use-options";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type LineItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  discountPercent: string | null;
  subtotal: string;
};

type ReceivableRow = {
  productId: string | null;
  label: string;
  value: string;
  parcels: string;
  firstDueDate: string;
  bankAccountId: string;
  categoryId: string;
};

type GenerateReceivablesModalProps = {
  open: boolean;
  onClose: () => void;
  dealId: string;
  companyId: string | null;
  lineItems: LineItem[];
};

function addMonthsStr(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0]!;
}

export function GenerateReceivablesModal({
  open,
  onClose,
  dealId,
  companyId,
  lineItems,
}: GenerateReceivablesModalProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"item" | "consolidated">("item");

  const bankOptions = useBankAccountOptions();
  const categoryOptions = useCategoryOptions("revenue");

  const totalValue = lineItems.reduce((sum, li) => sum + Number(li.subtotal), 0);

  const buildInitialRows = (): ReceivableRow[] => {
    if (mode === "consolidated") {
      return [
        {
          productId: null,
          label: "Total",
          value: totalValue.toFixed(2),
          parcels: "1",
          firstDueDate: "",
          bankAccountId: "",
          categoryId: "",
        },
      ];
    }
    return lineItems.map((li) => ({
      productId: li.productId,
      label: `Produto ${li.productId.slice(0, 8)}`,
      value: li.subtotal,
      parcels: "1",
      firstDueDate: "",
      bankAccountId: "",
      categoryId: "",
    }));
  };

  const [rows, setRows] = useState<ReceivableRow[]>(buildInitialRows);

  useEffect(() => {
    setRows(buildInitialRows());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lineItems]);

  const updateRow = (idx: number, field: keyof ReceivableRow, val: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)),
    );
  };

  const mutation = useMutation({
    mutationFn: () =>
      api
        .post("/contas-receber/gerar", {
          dealId,
          companyId,
          items: rows.map((r) => ({
            productId: r.productId || null,
            value: r.value,
            parcels: Number(r.parcels) || 1,
            firstDueDate: r.firstDueDate,
            bankAccountId: r.bankAccountId || null,
            categoryId: r.categoryId || null,
          })),
        })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success("Contas a receber geradas com sucesso");
      qc.invalidateQueries({ queryKey: ["contas-receber"] });
      qc.invalidateQueries({ queryKey: ["negocios"] });
      onClose();
    },
    onError: (e) =>
      toast.error(formatMutationError("Erro ao gerar contas a receber", e)),
  });

  const allValid = rows.every(
    (r) => Number(r.value) > 0 && Number(r.parcels) >= 1 && r.firstDueDate,
  );

  const consolidatedRow = mode === "consolidated" ? rows[0] : null;
  const numParcels = Number(consolidatedRow?.parcels) || 1;
  const parcelValue = (totalValue / numParcels).toFixed(2);
  const rateio = lineItems.map((li) => ({
    label: `Produto ${li.productId.slice(0, 8)}`,
    percentage: totalValue > 0 ? ((Number(li.subtotal) / totalValue) * 100).toFixed(1) : "0",
  }));
  const previewParcels = consolidatedRow?.firstDueDate
    ? Array.from({ length: numParcels }, (_, i) => ({
        number: `${i + 1}/${numParcels}`,
        value: parcelValue,
        dueDate: i === 0 ? consolidatedRow.firstDueDate : addMonthsStr(consolidatedRow.firstDueDate, i),
      }))
    : [];

  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Gerar contas a receber"
      className="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!allValid}
          >
            Confirmar e gerar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-1">
          <button
            type="button"
            onClick={() => setMode("item")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "item"
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]",
            )}
          >
            Por item
          </button>
          <button
            type="button"
            onClick={() => setMode("consolidated")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "consolidated"
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]",
            )}
          >
            Consolidado
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                <th className="pb-2 pr-2 font-medium">Item</th>
                <th className="pb-2 pr-2 font-medium">Valor</th>
                <th className="pb-2 pr-2 font-medium">Parcelas</th>
                <th className="pb-2 pr-2 font-medium">1° Venc.</th>
                <th className="pb-2 pr-2 font-medium">Conta</th>
                <th className="pb-2 font-medium">Categoria</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-[var(--color-border)] last:border-b-0"
                >
                  <td className="py-2 pr-2 text-[var(--color-text)]">
                    {row.label}
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={row.value}
                      onChange={(e) => updateRow(idx, "value", e.target.value)}
                      className="w-28"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min="1"
                      value={row.parcels}
                      onChange={(e) => updateRow(idx, "parcels", e.target.value)}
                      className="w-20"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="date"
                      value={row.firstDueDate}
                      onChange={(e) =>
                        updateRow(idx, "firstDueDate", e.target.value)
                      }
                      className="w-36"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Select
                      options={bankOptions}
                      value={row.bankAccountId}
                      onChange={(v) => updateRow(idx, "bankAccountId", v)}
                      placeholder="Conta"
                      className="w-36"
                    />
                  </td>
                  <td className="py-2">
                    <Select
                      options={categoryOptions}
                      value={row.categoryId}
                      onChange={(v) => updateRow(idx, "categoryId", v)}
                      placeholder="Categoria"
                      className="w-36"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {mode === "consolidated" && previewParcels.length > 0 && (
          <div className="overflow-x-auto">
            <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">Prévia das parcelas</p>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                  <th className="pb-2 pr-2 font-medium">#</th>
                  <th className="pb-2 pr-2 font-medium">Valor</th>
                  <th className="pb-2 pr-2 font-medium">Vencimento</th>
                  <th className="pb-2 font-medium">Rateio</th>
                </tr>
              </thead>
              <tbody>
                {previewParcels.map((p) => (
                  <tr key={p.number} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="py-1.5 pr-2 text-[var(--color-text)]">{p.number}</td>
                    <td className="py-1.5 pr-2 text-[var(--color-text)]">{formatCurrency(p.value)}</td>
                    <td className="py-1.5 pr-2 text-[var(--color-text)]">
                      {new Date(p.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-1.5 text-[var(--color-muted)]">
                      {rateio.map((r) => `${r.label}: ${r.percentage}%`).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-right text-sm font-medium text-[var(--color-text)]">
          Total: {formatCurrency(totalValue)}
        </div>
      </div>
    </Modal>
  );
}
