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
  useProductOptions,
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
  companyId: z.string().min(1, "Empresa obrigatória"),
  productId: z.preprocess(
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

type ContaReceberFormProps = {
  open: boolean;
  onClose: () => void;
  receivable?: any;
};

export function ContaReceberForm({ open, onClose, receivable }: ContaReceberFormProps) {
  const qc = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);

  const companyOptions = useCompanyOptions();
  const productOptionsFromHook = useProductOptions();
  const productOptions = [{ value: "", label: "Nenhum" }, ...productOptionsFromHook];
  const categoryOptions = useCategoryOptions("revenue");
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
      productId: "",
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
  const productId = watch("productId");
  const statusVal = watch("status");
  const categoryId = watch("categoryId");
  const bankAccountId = watch("bankAccountId");

  useEffect(() => {
    if (receivable) {
      reset({
        description: receivable.description ?? "",
        companyId: receivable.companyId ?? "",
        productId: receivable.productId ?? "",
        value: receivable.value ?? "",
        dueDate: receivable.dueDate ?? "",
        status: receivable.status ?? "",
        categoryId: receivable.categoryId ?? "",
        bankAccountId: receivable.bankAccountId ?? "",
        recurrence: "none",
        recurrenceCount: undefined,
      });
    } else {
      reset({
        description: "",
        companyId: "",
        productId: "",
        value: "",
        dueDate: "",
        status: "",
        categoryId: "",
        bankAccountId: "",
        recurrence: "none",
        recurrenceCount: undefined,
      });
    }
  }, [receivable, reset, companyOptions, productOptionsFromHook, categoryOptions, bankOptions]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const base = {
        ...data,
        productId: data.productId || null,
        categoryId: data.categoryId || null,
        bankAccountId: data.bankAccountId || null,
        recurrenceCount: data.recurrence !== "none" ? data.recurrenceCount : undefined,
      };
      if (receivable) {
        return api
          .patch(`/contas-receber/${receivable.id}`, {
            ...base,
            status: data.status || undefined,
          })
          .then((r) => r.data);
      }
      const { status: _s, ...createPayload } = base;
      return api.post("/contas-receber", createPayload).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success(receivable ? "Conta atualizada" : "Conta criada");
      qc.invalidateQueries({ queryKey: ["contas-receber"] });
      onClose();
    },
    onError: (e) =>
      toast.error(formatMutationError("Erro ao salvar conta a receber", e)),
  });

  const hasRecurrence = recurrence !== "none" && recurrence;
  const showRecurrenceCount = hasRecurrence && !receivable;

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
    if (hasRecurrence && data.recurrenceCount && !receivable) {
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
        title={receivable ? "Editar conta a receber" : "Nova conta a receber"}
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
            label="Empresa"
            options={companyOptions}
            value={companyId}
            onChange={(v) => setValue("companyId", v, { shouldValidate: true })}
          />
          {errors.companyId ? (
            <p className="-mt-3 text-sm text-[var(--color-red)]">{errors.companyId.message}</p>
          ) : null}

          <Select
            label="Produto (opcional)"
            options={productOptions}
            value={productId ?? ""}
            onChange={(v) => setValue("productId", v, { shouldValidate: true })}
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

          {receivable && (
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

          {!receivable && (
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
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
              <th className="pb-2 font-medium">Parcela</th>
              <th className="pb-2 font-medium">Vencimento</th>
              <th className="pb-2 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {previewParcels().map((p, i) => (
              <tr
                key={i}
                className="border-b border-[var(--color-border)] last:border-b-0"
              >
                <td className="py-2 text-[var(--color-text)]">{p.label}</td>
                <td className="py-2 text-[var(--color-text)]">
                  {formatDate(p.dueDate)}
                </td>
                <td className="py-2 text-[var(--color-text)]">
                  {formatCurrency(p.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </>
  );
}
