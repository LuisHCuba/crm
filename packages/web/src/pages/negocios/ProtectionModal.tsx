import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/format";

type LinkedReceivable = {
  id: string;
  description: string;
  value: number | string;
  parcelLabel: string;
  dueDate: string;
  status: string;
};

type ProtectionModalProps = {
  open: boolean;
  onClose: () => void;
  linkedReceivables: LinkedReceivable[];
  onConfirm: (cancelledIds: string[]) => void;
  loading?: boolean;
};

const STATUS_MAP: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  pending: { label: "Pendente", variant: "warning" },
  paid: { label: "Pago", variant: "success" },
  overdue: { label: "Vencido", variant: "danger" },
  cancelled: { label: "Cancelado", variant: "neutral" },
};

export function ProtectionModal({
  open,
  onClose,
  linkedReceivables,
  onConfirm,
  loading,
}: ProtectionModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (checkedIds.size === linkedReceivables.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(linkedReceivables.map((r) => r.id)));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(checkedIds));
    setCheckedIds(new Set());
  };

  const handleClose = () => {
    setCheckedIds(new Set());
    onClose();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && handleClose()}
      title="Contas a receber vinculadas"
      className="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Voltar
          </Button>
          <Button onClick={handleConfirm} loading={loading}>
            Confirmar
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-warning)_40%,transparent)] bg-[var(--color-warning-soft)] p-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--color-warning)]" />
        <p className="text-sm text-[var(--color-text)]">
          Este negócio possui{" "}
          <strong>{linkedReceivables.length}</strong>{" "}
          conta{linkedReceivables.length !== 1 ? "s" : ""} a receber.
          Selecione as que deseja cancelar ou confirme para manter como estão.
        </p>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={checkedIds.size === linkedReceivables.length && linkedReceivables.length > 0}
                  onChange={toggleAll}
                  aria-label="Selecionar todas"
                  className="size-4 rounded-[var(--radius-xs)] accent-[var(--color-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                />
              </th>
              <th className="px-3 py-2 font-medium">Descrição</th>
              <th className="px-3 py-2 font-medium">Valor</th>
              <th className="px-3 py-2 font-medium">Parcela</th>
              <th className="px-3 py-2 font-medium">Vencimento</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {linkedReceivables.map((r) => {
              const s = STATUS_MAP[r.status] ?? { label: r.status, variant: "neutral" as const };
              return (
                <tr
                  key={r.id}
                  className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-hover)]"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Cancelar ${r.description}`}
                      className="size-4 rounded-[var(--radius-xs)] accent-[var(--color-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                    />
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text)]">{r.description}</td>
                  <td className="px-3 py-2 text-[var(--color-text)]">{formatCurrency(r.value)}</td>
                  <td className="px-3 py-2 text-[var(--color-text)]">{r.parcelLabel}</td>
                  <td className="px-3 py-2 text-[var(--color-text)]">{formatDate(r.dueDate)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
