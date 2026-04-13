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

const contatoFormSchema = z.object({
  fullName: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  origin: z.preprocess(emptyToUndefined, z.enum(["website", "referral", "event", "other"]).optional()),
  stage: z.enum(["new", "qualified", "active_client", "inactive"]),
  responsibleId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

type ContatoFormValues = z.infer<typeof contatoFormSchema>;

type Contato = ContatoFormValues & { id: string };

type ContatoFormProps = {
  contato?: Contato | null;
  onSuccess: () => void;
};

const ORIGIN_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Indicação" },
  { value: "event", label: "Evento" },
  { value: "other", label: "Outro" },
];

const STAGE_OPTIONS = [
  { value: "new", label: "Novo" },
  { value: "qualified", label: "Qualificado" },
  { value: "active_client", label: "Cliente ativo" },
  { value: "inactive", label: "Inativo" },
];

export function ContatoForm({ contato, onSuccess }: ContatoFormProps) {
  const qc = useQueryClient();
  const isEdit = !!contato;
  const userOptions = useUserOptions();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContatoFormValues>({
    resolver: zodResolver(contatoFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      jobTitle: "",
      origin: "",
      stage: "new",
      responsibleId: "",
    },
  });

  useEffect(() => {
    if (contato) {
      reset({
        fullName: contato.fullName ?? "",
        email: contato.email ?? "",
        phone: contato.phone ?? "",
        jobTitle: contato.jobTitle ?? "",
        origin: contato.origin ?? "",
        stage: contato.stage ?? "new",
        responsibleId: contato.responsibleId ?? "",
      });
    }
  }, [contato, reset, userOptions]);

  const mutation = useMutation({
    mutationFn: (data: ContatoFormValues) => {
      const payload = {
        ...data,
        phone: data.phone || null,
        jobTitle: data.jobTitle || null,
        origin: data.origin || null,
        responsibleId: data.responsibleId || null,
      };
      if (isEdit) {
        return api.patch(`/contatos/${contato.id}`, payload);
      }
      return api.post("/contatos", payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Contato atualizado" : "Contato criado");
      qc.invalidateQueries({ queryKey: ["contatos"] });
      if (isEdit) {
        qc.invalidateQueries({ queryKey: ["contato", contato.id] });
      }
      onSuccess();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao salvar contato", e)),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v), (err) => { toast.error("Corrija os campos em vermelho"); })} className="flex flex-col gap-4">
      <Input label="Nome completo" {...register("fullName")} error={errors.fullName?.message} />
      <Input label="E-mail" type="email" {...register("email")} error={errors.email?.message} />
      <Input label="Telefone" {...register("phone")} error={errors.phone?.message} />
      <Input label="Cargo" {...register("jobTitle")} error={errors.jobTitle?.message} />

      <Controller
        control={control}
        name="origin"
        render={({ field }) => (
          <Select
            label="Origem"
            options={ORIGIN_OPTIONS}
            value={field.value ?? ""}
            onChange={field.onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="stage"
        render={({ field }) => (
          <Select
            label="Estágio"
            options={STAGE_OPTIONS}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <Select
        label="Responsável"
        options={userOptions}
        value={watch("responsibleId") ?? ""}
        onChange={(v) => setValue("responsibleId", v, { shouldValidate: true })}
        placeholder="Selecione…"
      />
      {errors.responsibleId ? (
        <p className="-mt-2 text-sm text-[var(--color-red)]">{errors.responsibleId.message}</p>
      ) : null}

      <Button type="submit" loading={mutation.isPending} className="mt-2">
        {isEdit ? "Salvar alterações" : "Criar contato"}
      </Button>
    </form>
  );
}
