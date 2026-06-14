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
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Escopo da exportação</legend>
        {([
          { value: "all", title: "Todos os contatos", desc: "Exporta a base completa." },
          { value: "filtered", title: "Com filtros atuais", desc: "Respeita busca e filtros aplicados na lista." },
        ] as const).map((opt) => {
          const selected = scope === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-ring)] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[var(--color-bg)] ${
                selected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              <input
                type="radio"
                name="export-scope"
                value={opt.value}
                checked={selected}
                onChange={() => setScope(opt.value)}
                className="sr-only"
              />
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-full)] border-2 ${
                  selected
                    ? "border-[var(--color-accent)]"
                    : "border-[var(--color-border-strong)]"
                }`}
                aria-hidden
              >
                {selected && (
                  <span className="size-2 rounded-[var(--radius-full)] bg-[var(--color-accent)]" />
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-[var(--color-text)]">{opt.title}</span>
                <span className="text-xs text-[var(--color-muted)]">{opt.desc}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </Modal>
  );
}
