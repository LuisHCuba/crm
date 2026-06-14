import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import {
  useBankAccountOptions,
  useCategoryOptions,
  useCompanyOptions,
} from "@/lib/use-options";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  STATUS_OPTIONS,
  RECURRENCE_OPTIONS,
  RECURRENCE_MONTHS,
  addMonths,
} from "@/lib/financial-constants";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const schema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  companyId: z.preprocess(
    emptyToUndefined,
    z.string().uuid().nullable().optional(),
  ),
  value: z.string().min(1, "Valor obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento obrigatória"),
  status: z.string().optional(),
  categoryId: z.preprocess(
    emptyToUndefined,
    z.string().uuid().nullable().optional(),
  ),
  bankAccountId: z.preprocess(
    emptyToUndefined,
    z.string().uuid().nullable().optional(),
  ),
  recurrence: z.string().default("none"),
  recurrenceCount: z.coerce.number().int().min(2).optional(),
});

type FormValues = z.infer<typeof schema>;

type ContaPagarFormProps = {
  open: boolean;
  onClose: () => void;
  payable?: {
    id: string;
    description?: string | null;
    companyId?: string | null;
    value?: string | null;
    dueDate?: string | null;
    status?: string | null;
    categoryId?: string | null;
    bankAccountId?: string | null;
  };
};

export function ContaPagarForm({ open, onClose, payable }: ContaPagarFormProps) {
  const qc = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);

  const companyOptionsFromHook = useCompanyOptions();
  const companyOptions = [{ value: "", label: "Nenhuma" }, ...companyOptionsFromHook];
  const categoryOptions = useCategoryOptions("expense");
  const bankOptions = useBankAccountOptions();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      description: "",
      companyId: "",
      value: "",
      dueDate: "",
      status: "",
      categoryId: "",
      bankAccountId: "",
      recurrence: "none",
      recurrenceCount: undefined,
    },
  });

  const recurrence = watch("recurrence");
  const recurrenceCount = watch("recurrenceCount");
  const dueDate = watch("dueDate");
  const value = watch("value");
  const companyId = watch("companyId");
  const statusVal = watch("status");
  const categoryId = watch("categoryId");
  const bankAccountId = watch("bankAccountId");

  useEffect(() => {
    if (payable) {
      reset({
        description: payable.description ?? "",
        companyId: payable.companyId ?? "",
        value: payable.value ?? "",
        dueDate: payable.dueDate ?? "",
        status: payable.status ?? "",
        categoryId: payable.categoryId ?? "",
        bankAccountId: payable.bankAccountId ?? "",
        recurrence: "none",
        recurrenceCount: undefined,
      });
    } else {
      reset({
        description: "",
        companyId: "",
        value: "",
        dueDate: "",
        status: "",
        categoryId: "",
        bankAccountId: "",
        recurrence: "none",
        recurrenceCount: undefined,
      });
    }
  }, [payable, reset, companyOptionsFromHook, categoryOptions, bankOptions]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const base = {
        ...data,
        companyId: data.companyId || null,
        categoryId: data.categoryId || null,
        bankAccountId: data.bankAccountId || null,
        recurrenceCount: data.recurrence !== "none" ? data.recurrenceCount : undefined,
      };
      if (payable) {
        return api
          .patch(`/contas-pagar/${payable.id}`, {
            ...base,
            status: data.status || undefined,
          })
          .then((r) => r.data);
      }
      const { status: _s, ...createPayload } = base;
      return api.post("/contas-pagar", createPayload).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success(payable ? "Conta atualizada" : "Conta criada");
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      onClose();
    },
    onError: (e) =>
      toast.error(formatMutationError("Erro ao salvar conta a pagar", e)),
  });

  const hasRecurrence = recurrence !== "none" && recurrence;
  const showRecurrenceCount = hasRecurrence && !payable;

  const previewParcels = () => {
    if (!hasRecurrence || !recurrenceCount || !dueDate || !value) return [];
    const months = RECURRENCE_MONTHS[recurrence] ?? 1;
    return Array.from({ length: recurrenceCount }, (_, i) => ({
      label: `${i + 1}/${recurrenceCount}`,
      dueDate: i === 0 ? dueDate : addMonths(dueDate, months * i),
      value,
    }));
  };

  const onValidationError = (errors: unknown) => {
    console.error("Validation:", errors);
    toast.error("Corrija os campos");
  };

  const onSubmit = (data: FormValues) => {
    if (hasRecurrence && data.recurrenceCount && !payable) {
      setPreviewOpen(true);
    } else {
      mutation.mutate(data);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={payable ? "Editar conta a pagar" : "Nova conta a pagar"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit(onSubmit, onValidationError)}
              loading={mutation.isPending}
            >
              Salvar
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Input
            label="Descrição"
            {...register("description")}
            error={errors.description?.message}
          />

          <Select
            label="Empresa (opcional)"
            options={companyOptions}
            value={companyId ?? ""}
            onChange={(v) => setValue("companyId", v, { shouldValidate: true })}
          />

          <Input
            label="Valor"
            type="number"
            step="0.01"
            {...register("value")}
            error={errors.value?.message}
          />

          <Input
            label="Data de vencimento"
            type="date"
            {...register("dueDate")}
            error={errors.dueDate?.message}
          />

          {payable && (
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={statusVal ?? ""}
              onChange={(v) => setValue("status", v, { shouldValidate: true })}
            />
          )}

          <Select
            label="Categoria"
            options={categoryOptions}
            value={categoryId ?? ""}
            onChange={(v) => setValue("categoryId", v, { shouldValidate: true })}
            placeholder="Selecione…"
          />

          <Select
            label="Conta bancária"
            options={bankOptions}
            value={bankAccountId ?? ""}
            onChange={(v) => setValue("bankAccountId", v, { shouldValidate: true })}
            placeholder="Selecione…"
          />

          {!payable && (
            <>
              <Controller
                control={control}
                name="recurrence"
                render={({ field }) => (
                  <Select
                    label="Recorrência"
                    options={RECURRENCE_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              {showRecurrenceCount && (
                <Input
                  label="Número de parcelas"
                  type="number"
                  min={2}
                  {...register("recurrenceCount")}
                  error={errors.recurrenceCount?.message as string | undefined}
                />
              )}
            </>
          )}
        </form>
      </Drawer>

      <Modal
        open={previewOpen}
        onOpenChange={(v) => !v && setPreviewOpen(false)}
        title="Prévia das parcelas"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Voltar
            </Button>
            <Button
              onClick={handleSubmit(
                (data) => {
                  setPreviewOpen(false);
                  mutation.mutate(data);
                },
                onValidationError,
              )}
              loading={mutation.isPending}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[var(--color-surface-2)] text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                <th className="px-3 py-2 font-medium">Parcela</th>
                <th className="px-3 py-2 font-medium">Vencimento</th>
                <th className="px-3 py-2 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {previewParcels().map((p, i) => (
                <tr key={i} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 text-[var(--color-text)]">{p.label}</td>
                  <td className="px-3 py-2 text-[var(--color-text)]">{formatDate(p.dueDate)}</td>
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{formatCurrency(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
