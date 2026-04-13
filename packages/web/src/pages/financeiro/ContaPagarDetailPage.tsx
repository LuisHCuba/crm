import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import {
  useBankAccountOptions,
  useCategoryOptions,
  useCompanyOptions,
} from "@/lib/use-options";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { AuditHistory } from "@/components/AuditHistory";
import { ContaPagarForm } from "./ContaPagarForm";

const STATUS_VARIANT: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  paid: "success",
  overdue: "danger",
  cancelled: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

const paySchema = z.object({
  paymentDate: z.string().min(1, "Data obrigatória"),
  paidValue: z.string().min(1, "Valor obrigatório"),
  bankAccountId: z.string().min(1, "Conta obrigatória"),
});

type PayForm = z.infer<typeof paySchema>;

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text)]">{children}</span>
    </div>
  );
}

function resolveLabel(options: { value: string; label: string }[], id: string | null | undefined) {
  if (!id) return null;
  return options.find((o) => o.value === id)?.label ?? id;
}

export function ContaPagarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<"info" | "historico">("info");

  const { data: payable, isLoading } = useQuery({
    queryKey: ["contas-pagar", id],
    queryFn: () => api.get(`/contas-pagar/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const companyOptions = useCompanyOptions();
  const categoryOptions = useCategoryOptions("expense");
  const bankOptions = useBankAccountOptions();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset: resetPayForm,
    formState: { errors },
  } = useForm<PayForm>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split("T")[0],
      paidValue: "",
      bankAccountId: "",
    },
  });

  const bankAccountId = watch("bankAccountId");

  const openPayModal = () => {
    resetPayForm({
      paymentDate: new Date().toISOString().split("T")[0],
      paidValue: payable?.value?.toString() ?? "",
      bankAccountId: payable?.bankAccountId ?? "",
    });
    setPayOpen(true);
  };

  const payMutation = useMutation({
    mutationFn: (data: PayForm) =>
      api.patch(`/contas-pagar/${id}/pagar`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Pagamento registrado");
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      setPayOpen(false);
    },
    onError: (e) => toast.error(formatMutationError("Erro ao registrar pagamento", e)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/contas-pagar/${id}/cancelar`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Conta cancelada");
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      setCancelOpen(false);
    },
    onError: (e) => toast.error(formatMutationError("Erro ao cancelar", e)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.delete(`/contas-pagar/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Conta arquivada");
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      navigate("/contas-pagar");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao arquivar", e)),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      api.patch(`/contas-pagar/${id}`, { status: newStatus }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao atualizar status", e)),
  });

  if (isLoading) {
    return <p className="py-20 text-center text-[var(--color-muted)]">Carregando…</p>;
  }

  if (!payable) {
    return <p className="py-20 text-center text-[var(--color-muted)]">Registro não encontrado.</p>;
  }

  const canAct = payable.status === "pending" || payable.status === "overdue";

  const ALL_STATUSES = [
    { key: "pending", label: "Pendente" },
    { key: "paid", label: "Pago" },
    { key: "overdue", label: "Vencido" },
    { key: "cancelled", label: "Cancelado" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contas-pagar")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--color-text)]">
              {payable.description}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {ALL_STATUSES.map((s) => {
              const isCurrent = s.key === payable.status;
              const disabled = statusMutation.isPending || s.key === "paid";
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={disabled && !isCurrent}
                  onClick={() => {
                    if (!isCurrent && s.key !== "paid") statusMutation.mutate(s.key);
                  }}
                  title={s.key === "paid" && !isCurrent ? "Use o botão 'Pagar' para marcar como pago" : undefined}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    isCurrent
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-sm"
                      : s.key === "paid"
                        ? "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] opacity-50"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
            <span className="font-semibold text-[var(--color-accent)]">
              {formatCurrency(payable.value)}
            </span>
            {payable.parcelLabel && <span>Parcela: {payable.parcelLabel}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
          {canAct && (
            <Button onClick={openPayModal}>Registrar pagamento</Button>
          )}
          <Button variant="ghost" onClick={() => setArchiveOpen(true)}>
            Arquivar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[var(--color-border)]">
        {(["info", "historico"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {t === "info" ? "Informações" : "Histórico"}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-3">
            <InfoField label="Empresa">
              {payable.companyId ? (
                <Link
                  to={`/empresas/${payable.companyId}`}
                  className="text-[var(--color-accent)] hover:underline"
                >
                  {resolveLabel(companyOptions, payable.companyId)}
                </Link>
              ) : (
                "—"
              )}
            </InfoField>

            <InfoField label="Categoria">
              {resolveLabel(categoryOptions, payable.categoryId) ?? "—"}
            </InfoField>

            <InfoField label="Conta bancária">
              {resolveLabel(bankOptions, payable.bankAccountId) ?? "—"}
            </InfoField>

            <InfoField label="Vencimento">
              {formatDate(payable.dueDate)}
            </InfoField>

            {payable.parcelGroup && (
              <InfoField label="Grupo de parcelas">
                {payable.parcelGroup}
              </InfoField>
            )}

            <InfoField label="Data de criação">
              {payable.createdAt
                ? new Date(payable.createdAt).toLocaleString("pt-BR")
                : "—"}
            </InfoField>
          </div>

          {payable.status === "paid" && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
                Dados do pagamento
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                <InfoField label="Data do pagamento">
                  {formatDate(payable.paymentDate)}
                </InfoField>
                <InfoField label="Valor pago">
                  <span className="font-semibold text-[var(--color-green)]">
                    {formatCurrency(payable.paidValue)}
                  </span>
                </InfoField>
                <InfoField label="Conta bancária (saída)">
                  {resolveLabel(bankOptions, payable.bankAccountId) ?? "—"}
                </InfoField>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "historico" && (
        <AuditHistory objectType="payable" recordId={id} />
      )}

      {/* Drawer editar */}
      <ContaPagarForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        payable={editOpen ? payable : undefined}
      />

      {/* Modal registrar pagamento */}
      <Modal
        open={payOpen}
        onOpenChange={(v) => !v && setPayOpen(false)}
        title="Registrar pagamento"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit((data) => payMutation.mutate(data))}
              loading={payMutation.isPending}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            label="Data do pagamento"
            type="date"
            {...register("paymentDate")}
            error={errors.paymentDate?.message}
          />
          <Input
            label="Valor pago"
            type="number"
            step="0.01"
            {...register("paidValue")}
            error={errors.paidValue?.message}
          />
          <Select
            label="Conta bancária"
            options={bankOptions}
            value={bankAccountId}
            onChange={(v) => setValue("bankAccountId", v, { shouldValidate: true })}
            placeholder="Selecione…"
          />
          {errors.bankAccountId && (
            <p className="-mt-3 text-sm text-[var(--color-red)]">{errors.bankAccountId.message}</p>
          )}
        </form>
      </Modal>

      {/* Modal cancelar */}
      <Modal
        open={cancelOpen}
        onOpenChange={(v) => !v && setCancelOpen(false)}
        title="Cancelar conta a pagar"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={() => cancelMutation.mutate()}
              loading={cancelMutation.isPending}
            >
              Confirmar cancelamento
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text)]">
          Tem certeza que deseja cancelar esta conta a pagar? Esta ação não pode ser desfeita.
        </p>
      </Modal>

      {/* Modal arquivar */}
      <Modal
        open={archiveOpen}
        onOpenChange={(v) => !v && setArchiveOpen(false)}
        title="Arquivar conta a pagar"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setArchiveOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={() => archiveMutation.mutate()}
              loading={archiveMutation.isPending}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text)]">
          Tem certeza que deseja arquivar esta conta a pagar? O registro será removido permanentemente.
        </p>
      </Modal>
    </div>
  );
}
