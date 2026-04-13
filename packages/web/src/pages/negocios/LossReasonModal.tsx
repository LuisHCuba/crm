import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const LOSS_REASONS = [
  { value: "price", label: "Preço" },
  { value: "competition", label: "Concorrência" },
  { value: "timing", label: "Timing" },
  { value: "no_response", label: "Sem resposta" },
  { value: "other", label: "Outro" },
];

type LossReasonModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
};

export function LossReasonModal({ open, onClose, onConfirm, loading }: LossReasonModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm(reason);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setReason("");
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Motivo da perda"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={!reason} loading={loading}>
            Confirmar
          </Button>
        </div>
      }
    >
      <Select
        label="Motivo"
        options={LOSS_REASONS}
        value={reason}
        onChange={setReason}
        placeholder="Selecione o motivo…"
      />
    </Modal>
  );
}
