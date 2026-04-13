import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type ExportScope = "all" | "filtered";

type ExportModalProps = {
  open: boolean;
  onClose: () => void;
  currentFilters: Record<string, string>;
};

export function ExportModal({ open, onClose, currentFilters }: ExportModalProps) {
  const [scope, setScope] = useState<ExportScope>("all");
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const params: Record<string, string> = { scope };
      if (scope === "filtered") {
        Object.entries(currentFilters).forEach(([k, v]) => {
          if (v) params[k] = v;
        });
      }

      const res = await api.get("/contatos/exportar", {
        params,
        responseType: "blob",
      });

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contatos.xlsx";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Exportação concluída");
      onClose();
    } catch {
      toast.error("Erro ao exportar contatos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => { if (!v) onClose(); }}
      title="Exportar contatos"
      footer={
        <div className="flex justify-end">
          <Button onClick={handleExport} loading={loading}>
            Exportar .xlsx
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setScope("all")}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
            scope === "all"
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]"
          }`}
        >
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
              scope === "all"
                ? "border-[var(--color-accent)]"
                : "border-[var(--color-muted)]"
            }`}
          >
            {scope === "all" && (
              <span className="size-2 rounded-full bg-[var(--color-accent)]" />
            )}
          </span>
          Todos os contatos
        </button>

        <button
          type="button"
          onClick={() => setScope("filtered")}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
            scope === "filtered"
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]"
          }`}
        >
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
              scope === "filtered"
                ? "border-[var(--color-accent)]"
                : "border-[var(--color-muted)]"
            }`}
          >
            {scope === "filtered" && (
              <span className="size-2 rounded-full bg-[var(--color-accent)]" />
            )}
          </span>
          Com filtros atuais
        </button>
      </div>
    </Modal>
  );
}
