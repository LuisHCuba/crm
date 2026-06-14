import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import { useUserOptions } from "@/lib/use-options";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const empresaFormSchema = z.object({
  legalName: z.string().min(1, "Razão social obrigatória"),
  tradeName: z.string().optional(),
  document: z.string().min(1, "Documento obrigatório"),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional(),
  address: z.string().optional(),
  type: z.enum(["client", "supplier", "both"]),
  responsibleId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

type EmpresaFormValues = z.infer<typeof empresaFormSchema>;

type Empresa = EmpresaFormValues & { id: string };

type EmpresaFormProps = {
  empresa?: Empresa | null;
  onSuccess: () => void;
};

const TYPE_OPTIONS = [
  { value: "client", label: "Cliente" },
  { value: "supplier", label: "Fornecedor" },
  { value: "both", label: "Ambos" },
];

export function EmpresaForm({ empresa, onSuccess }: EmpresaFormProps) {
  const qc = useQueryClient();
  const isEdit = !!empresa;
  const userOptions = useUserOptions();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmpresaFormValues>({
    resolver: zodResolver(empresaFormSchema),
    defaultValues: {
      legalName: "",
      tradeName: "",
      document: "",
      phone: "",
      email: "",
      address: "",
      type: "client",
      responsibleId: "",
    },
  });

  useEffect(() => {
    if (empresa) {
      reset({
        legalName: empresa.legalName ?? "",
        tradeName: empresa.tradeName ?? "",
        document: empresa.document ?? "",
        phone: empresa.phone ?? "",
        email: empresa.email ?? "",
        address: empresa.address ?? "",
        type: empresa.type ?? "client",
        responsibleId: empresa.responsibleId ?? "",
      });
    }
  }, [empresa, reset, userOptions]);

  const mutation = useMutation({
    mutationFn: (data: EmpresaFormValues) => {
      const payload = {
        ...data,
        tradeName: data.tradeName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        responsibleId: data.responsibleId || null,
      };
      if (isEdit) {
        return api.patch(`/empresas/${empresa.id}`, payload);
      }
      return api.post("/empresas", payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Empresa atualizada" : "Empresa criada");
      qc.invalidateQueries({ queryKey: ["empresas"] });
      if (isEdit) {
        qc.invalidateQueries({ queryKey: ["empresa", empresa.id] });
      }
      onSuccess();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao salvar empresa", e)),
  });

  return (
    <form
      onSubmit={handleSubmit(
        (v) => mutation.mutate(v),
        () => {
          toast.error("Corrija os campos");
        },
      )}
      className="flex flex-col gap-5"
    >
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Identificação
        </legend>
        <Input label="Razão social" {...register("legalName")} error={errors.legalName?.message} />
        <Input label="Nome fantasia" {...register("tradeName")} error={errors.tradeName?.message} />
        <Input label="CNPJ / CPF" {...register("document")} error={errors.document?.message} />
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-5">
        <legend className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Contato
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Telefone" {...register("phone")} error={errors.phone?.message} />
          <Input label="E-mail" type="email" {...register("email")} error={errors.email?.message} />
        </div>
        <Input label="Endereço" {...register("address")} error={errors.address?.message} />
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-5">
        <legend className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Classificação
        </legend>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              label="Tipo"
              options={TYPE_OPTIONS}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <div className="flex flex-col gap-1.5">
          <Select
            label="Responsável"
            options={userOptions}
            value={watch("responsibleId") ?? ""}
            onChange={(v) => setValue("responsibleId", v, { shouldValidate: true })}
            placeholder="Selecione…"
          />
          {errors.responsibleId ? (
            <p className="text-sm text-[var(--color-danger)]" role="alert">{errors.responsibleId.message}</p>
          ) : null}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-5">
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? "Salvar alterações" : "Criar empresa"}
        </Button>
      </div>
    </form>
  );
}
