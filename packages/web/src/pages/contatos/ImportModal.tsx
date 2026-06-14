import { useState, useCallback, useRef, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { api, formatMutationError } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

type ImportRow = {
  rowNumber: number;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string | null;
  origin: string | null;
  stage: string | null;
  status: "new" | "duplicate";
  action: "create" | "update" | "skip";
  existingId: string | null;
};

type ImportModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const DUPLICATE_ACTION_OPTIONS = [
  { value: "update", label: "Atualizar" },
  { value: "skip", label: "Pular" },
];

export function ImportModal({ open, onClose, onSuccess }: ImportModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep(1);
    setRows([]);
    setUploading(false);
    setConfirming(false);
    setDragOver(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ rows: Array<{ rowNumber: number; data: { fullName: string; email: string; phone: string | null; jobTitle: string | null; origin: string | null; stage: string | null }; status: "new" | "duplicate"; existingId: string | null }> }>("/contatos/importar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const preview = res.data.rows;
      setRows(
        preview.map((r, i) => ({
          rowNumber: r.rowNumber ?? i + 1,
          fullName: r.data.fullName,
          email: r.data.email,
          phone: r.data.phone ?? "",
          jobTitle: r.data.jobTitle ?? null,
          origin: r.data.origin ?? null,
          stage: r.data.stage ?? null,
          status: r.status,
          existingId: r.existingId,
          action: r.status === "new" ? ("create" as const) : ("skip" as const),
        })),
      );
      setStep(2);
    } catch (e) {
      toast.error(formatMutationError("Erro ao processar arquivo", e));
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, []);

  function updateRow(index: number, patch: Partial<ImportRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  const newCount = rows.filter((r) => r.status === "new").length;
  const dupCount = rows.filter((r) => r.status === "duplicate").length;

  async function handleConfirm() {
    setConfirming(true);
    try {
      const payload = {
        rows: rows.map((r) => ({
          data: {
            fullName: r.fullName,
            email: r.email,
            phone: r.phone || null,
            jobTitle: r.jobTitle ?? null,
            origin: r.origin ?? null,
            stage: r.stage ?? null,
          },
          action: r.action,
          existingId: r.existingId,
        })),
      };
      const res = await api.post<{ created: number; updated: number; skipped: number }>(
        "/contatos/importar/confirmar",
        payload,
      );
      const summary = res.data;
      toast.success(
        `${summary.created} criado(s), ${summary.updated} atualizado(s), ${summary.skipped} pulado(s)`,
      );
      onSuccess();
      handleClose();
    } catch (e) {
      toast.error(formatMutationError("Erro ao importar contatos", e));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(v) => { if (!v) handleClose(); }}
      title="Importar contatos"
      className={step === 2 ? "max-w-4xl" : undefined}
      footer={
        step === 2 ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-muted)]">
              {newCount} novo(s), {dupCount} duplicado(s)
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} loading={confirming}>
                Importar
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {step === 1 && (
        <>
        <div
          role="button"
          tabIndex={0}
          aria-label="Arraste um arquivo .xlsx ou clique para selecionar"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border-2 border-dashed px-6 py-12 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
            dragOver
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "border-[var(--color-border-strong)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="size-8 animate-spin text-[var(--color-accent)]" aria-hidden />
              <p className="text-sm text-[var(--color-muted)]">Processando arquivo…</p>
            </>
          ) : (
            <>
              <span className="flex size-12 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent-soft)]" aria-hidden>
                <Upload className="size-6 text-[var(--color-accent)]" />
              </span>
              <p className="text-sm text-[var(--color-text)]">
                Arraste um arquivo <strong>.xlsx</strong> ou clique para selecionar
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Apenas arquivos .xlsx são aceitos
              </p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Selecionar arquivo .xlsx"
        />
        </>
      )}

      {step === 2 && (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)]">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">#</th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Nome</th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">E-mail</th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Telefone</th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Status</th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-3 py-2 text-[var(--color-muted)]">{row.rowNumber}</td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.fullName}
                      onChange={(e) => updateRow(i, { fullName: e.target.value })}
                      className="min-w-[10rem]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.email}
                      onChange={(e) => updateRow(i, { email: e.target.value })}
                      className="min-w-[12rem]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.phone}
                      onChange={(e) => updateRow(i, { phone: e.target.value })}
                      className="min-w-[9rem]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {row.status === "new" ? (
                      <Badge variant="success">Novo</Badge>
                    ) : (
                      <Badge variant="warning">Duplicado</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.status === "new" ? (
                      <span className="text-sm text-[var(--color-muted)]">Criar</span>
                    ) : (
                      <Select
                        options={DUPLICATE_ACTION_OPTIONS}
                        value={row.action}
                        onChange={(v) => updateRow(i, { action: v as "update" | "skip" })}
                        className="min-w-[8rem]"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
