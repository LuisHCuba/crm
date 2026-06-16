import { type FormEvent } from "react";
import { Trophy, XCircle } from "lucide-react";
import type { DealLossReason, StageType } from "../../lib/queries/crm";
import { LOSS_REASON_LABELS } from "./labels";
import { Modal, SelectField, SubmitButton, TextField } from "./ui";

export interface CloseDealResult {
  closed_at: string;
  loss_reason: DealLossReason | null;
}

/** Modal estilo HubSpot exibido ao mover um negócio para Ganho/Perdido. */
export function CloseDealModal({
  type,
  stageName,
  loading,
  onClose,
  onConfirm,
}: {
  type: Extract<StageType, "won" | "lost">;
  stageName: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (result: CloseDealResult) => void;
}) {
  const won = type === "won";

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dateStr = fd.get("closed_at") as string;
    onConfirm({
      closed_at: dateStr
        ? new Date(dateStr).toISOString()
        : new Date().toISOString(),
      loss_reason: won ? null : ((fd.get("loss_reason") as DealLossReason) || "other"),
    });
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal title={`Marcar como "${stageName}"`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className={`flex items-center gap-3 rounded-xl p-4 ${
            won ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {won ? <Trophy size={22} /> : <XCircle size={22} />}
          <p className="text-sm font-medium">
            {won
              ? "Parabéns! Confirme a data de fechamento do negócio ganho."
              : "Informe o motivo da perda e a data de fechamento."}
          </p>
        </div>

        <TextField
          name="closed_at"
          label="Data de fechamento"
          type="date"
          required
          defaultValue={today}
        />

        {!won && (
          <SelectField
            name="loss_reason"
            label="Motivo da perda"
            required
            defaultValue="price"
            options={Object.entries(LOSS_REASON_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        )}

        <SubmitButton loading={loading}>Confirmar</SubmitButton>
      </form>
    </Modal>
  );
}
