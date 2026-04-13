import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const produtoFormSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  sku: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.string().min(1, "Preço obrigatório").transform((v) => v.replace(",", ".")).pipe(z.string().regex(/^\d+(\.\d+)?$/, "Preço inválido")),
  unit: z.string().min(1, "Unidade obrigatória"),
  active: z.enum(["true", "false"]),
});

type ProdutoFormValues = z.infer<typeof produtoFormSchema>;

type Produto = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  basePrice: string;
  unit: string;
  active: boolean;
};

type ProdutoFormProps = {
  produto?: Produto | null;
  onSuccess: () => void;
};

const UNIT_OPTIONS = [
  { value: "un", label: "Unidade" },
  { value: "hr", label: "Hora" },
  { value: "kg", label: "Quilograma" },
  { value: "m", label: "Metro" },
  { value: "l", label: "Litro" },
  { value: "srv", label: "Serviço" },
];

const ACTIVE_OPTIONS = [
  { value: "true", label: "Ativo" },
  { value: "false", label: "Inativo" },
];

export function ProdutoForm({ produto, onSuccess }: ProdutoFormProps) {
  const qc = useQueryClient();
  const isEdit = !!produto;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      basePrice: "",
      unit: "un",
      active: "true",
    },
  });

  useEffect(() => {
    if (produto) {
      reset({
        name: produto.name ?? "",
        sku: produto.sku ?? "",
        description: produto.description ?? "",
        basePrice: produto.basePrice ?? "",
        unit: produto.unit ?? "un",
        active: produto.active ? "true" : "false",
      });
    }
  }, [produto, reset]);

  const mutation = useMutation({
    mutationFn: (data: ProdutoFormValues) => {
      const payload = {
        name: data.name,
        sku: data.sku || undefined,
        description: data.description || null,
        basePrice: data.basePrice,
        unit: data.unit,
        active: data.active === "true",
      };
      if (isEdit) {
        return api.patch(`/produtos/${produto.id}`, payload);
      }
      return api.post("/produtos", payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Produto atualizado" : "Produto criado");
      qc.invalidateQueries({ queryKey: ["produtos"] });
      if (isEdit) {
        qc.invalidateQueries({ queryKey: ["produto", produto.id] });
      }
      onSuccess();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao salvar produto", e)),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
      <Input label="Nome" {...register("name")} error={errors.name?.message} />
      <Input label="SKU" {...register("sku")} error={errors.sku?.message} />
      <Input label="Descrição" {...register("description")} error={errors.description?.message} />
      <Input label="Preço base" {...register("basePrice")} error={errors.basePrice?.message} placeholder="0.00" />

      <Controller
        control={control}
        name="unit"
        render={({ field }) => (
          <Select label="Unidade" options={UNIT_OPTIONS} value={field.value} onChange={field.onChange} />
        )}
      />

      <Controller
        control={control}
        name="active"
        render={({ field }) => (
          <Select label="Status" options={ACTIVE_OPTIONS} value={field.value} onChange={field.onChange} />
        )}
      />

      <Button type="submit" loading={mutation.isPending} className="mt-2">
        {isEdit ? "Salvar alterações" : "Criar produto"}
      </Button>
    </form>
  );
}
