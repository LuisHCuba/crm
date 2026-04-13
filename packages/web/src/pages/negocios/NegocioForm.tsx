import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import {
  useCompanyOptions,
  usePipelineOptions,
  useUserOptions,
} from "@/lib/use-options";
import { AsyncCombobox } from "@/components/ui/AsyncCombobox";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

function ContactIdsPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [labels, setLabels] = useState<Map<string, string>>(new Map());
  const lastResults = useRef<Map<string, string>>(new Map());

  const searchContacts = async (query: string) => {
    const res = await api.get("/contatos", { params: { search: query, perPage: 20 } });
    const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    const options = data
      .filter(
        (c: any) =>
          typeof c?.id === "string" &&
          c.id.length > 0 &&
          !value.includes(c.id),
      )
      .map((c: any) => ({ value: c.id, label: c.fullName }));
    lastResults.current = new Map(
      options.map((o) => [o.value, o.label] as [string, string]),
    );
    return options;
  };

  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
        Contatos vinculados
      </label>
      <p className="mb-2 text-xs text-[var(--color-muted)]">
        Opcional. Adicione quem participa deste negócio; você pode alterar depois na ficha.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {value.map((cid) => (
          <span
            key={cid}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-accent)]"
          >
            {labels.get(cid) ?? cid}
            <button
              type="button"
              onClick={() => onChange(value.filter((id) => id !== cid))}
              aria-label={`Remover ${labels.get(cid) ?? cid}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <AsyncCombobox
        className="mt-2"
        placeholder="Buscar contato..."
        value=""
        onChange={(id) => {
          if (typeof id !== "string" || !id.trim()) return;
          if (lastResults.current.has(id)) {
            setLabels((prev) => new Map(prev).set(id, lastResults.current.get(id)!));
          }
          onChange([...value, id]);
        }}
        searchFn={searchContacts}
        disabled={false}
      />
    </div>
  );
}

const LOSS_REASONS = [
  { value: "price", label: "Preço" },
  { value: "competition", label: "Concorrência" },
  { value: "timing", label: "Timing" },
  { value: "no_response", label: "Sem resposta" },
  { value: "other", label: "Outro" },
];

const schema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  companyId: z.string().optional(),
  pipelineId: z.string().min(1, "Pipeline obrigatório"),
  stageId: z.string().min(1, "Estágio obrigatório"),
  forecastDate: z.string().optional(),
  responsibleId: z.string().min(1, "Responsável obrigatório"),
  lossReason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Deal = {
  id: string;
  title: string | null;
  companyId: string | null;
  pipelineId: string | null;
  stageId: string | null;
  forecastDate: string | null;
  responsibleId: string | null;
  lossReason?: string | null;
};

type NegocioFormProps = {
  open: boolean;
  onClose: () => void;
  deal?: Deal | null;
  onSaveSuccess?: (data: any) => void;
};

export function NegocioForm({ open, onClose, deal, onSaveSuccess }: NegocioFormProps) {
  const qc = useQueryClient();
  const userOptions = useUserOptions();
  const companyOptions = useCompanyOptions();
  const pipelineOptions = usePipelineOptions();
  const [createContactIds, setCreateContactIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      companyId: "",
      pipelineId: "",
      stageId: "",
      forecastDate: "",
      responsibleId: "",
      lossReason: "",
    },
  });

  const selectedPipelineId = watch("pipelineId");

  const { data: stagesRaw } = useQuery({
    queryKey: ["pipeline-stages-options", selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      const res = await api.get(`/pipelines/${selectedPipelineId}`);
      return res.data?.stages ?? [];
    },
    enabled: !!selectedPipelineId,
    staleTime: 60_000,
  });
  const stageOptions = (stagesRaw ?? [])
    .filter((s: any) => typeof s?.id === "string" && s.id.length > 0)
    .map((s: any) => ({ value: s.id, label: s.name }));
  const selectedStageType = (stagesRaw ?? []).find((s: any) => s.id === watch("stageId"))?.type;

  useEffect(() => {
    if (!open) return;
    if (deal) {
      setCreateContactIds([]);
      reset({
        title: deal.title ?? "",
        companyId: deal.companyId ?? "",
        pipelineId: deal.pipelineId ?? "",
        stageId: deal.stageId ?? "",
        forecastDate: deal.forecastDate ?? "",
        responsibleId: deal.responsibleId ?? "",
        lossReason: deal.lossReason ?? "",
      });
    } else {
      setCreateContactIds([]);
      reset({
        title: "",
        companyId: "",
        pipelineId: "",
        stageId: "",
        forecastDate: "",
        responsibleId: "",
        lossReason: "",
      });
    }
  }, [open, deal?.id, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      if (deal) {
        return api
          .patch(`/negocios/${deal.id}`, {
            title: data.title,
            companyId: data.companyId || null,
            pipelineId: data.pipelineId || undefined,
            stageId: data.stageId || undefined,
            forecastDate: data.forecastDate === "" ? null : data.forecastDate,
            responsibleId: data.responsibleId || undefined,
            lossReason: data.lossReason || undefined,
          })
          .then((r) => r.data);
      }
      const contactIds = createContactIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      );
      const str = (v: string | null | undefined) => (v == null ? "" : v);
      return api.post("/negocios", {
        title: str(data.title),
        ...(data.companyId ? { companyId: data.companyId } : {}),
        pipelineId: str(data.pipelineId),
        stageId: str(data.stageId),
        ...(data.forecastDate ? { forecastDate: data.forecastDate } : {}),
        responsibleId: str(data.responsibleId),
        ...(contactIds.length > 0 ? { contactIds } : {}),
      })
        .then((r) => r.data);
    },
    onSuccess: (data) => {
      toast.success(deal ? "Negócio atualizado" : "Negócio criado");
      qc.invalidateQueries({ queryKey: ["negocios"] });
      onClose();
      onSaveSuccess?.(data);
    },
    onError: (e) => toast.error(formatMutationError("Erro ao salvar negócio", e)),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={deal ? "Editar negócio" : "Novo negócio"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(
              (data) => {
                const stageType = (stagesRaw ?? []).find((s: any) => s.id === data.stageId)?.type;
                if (stageType === "lost" && !data.lossReason) {
                  toast.error("Informe o motivo da perda");
                  return;
                }
                mutation.mutate(data);
              },
              (errs) => {
                toast.error("Corrija os campos");
              },
            )}
            loading={mutation.isPending}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <Input
          label="Título"
          {...register("title")}
          error={errors.title?.message}
        />

        <Select
          label="Empresa"
          options={companyOptions}
          value={watch("companyId") ?? ""}
          onChange={(v) => setValue("companyId", v, { shouldValidate: true })}
          placeholder="Sem empresa (opcional)"
        />

        <Select
          label="Pipeline"
          options={pipelineOptions}
          value={watch("pipelineId") ?? ""}
          onChange={(v) => {
            setValue("pipelineId", v, { shouldValidate: true });
            setValue("stageId", "", { shouldValidate: true });
          }}
        />
        {errors.pipelineId ? (
          <p className="-mt-3 text-sm text-[var(--color-red)]">{errors.pipelineId.message}</p>
        ) : null}

        <Select
          label="Estágio"
          options={stageOptions}
          value={watch("stageId") ?? ""}
          onChange={(v) => setValue("stageId", v, { shouldValidate: true })}
          disabled={!selectedPipelineId}
        />
        {errors.stageId ? (
          <p className="-mt-3 text-sm text-[var(--color-red)]">{errors.stageId.message}</p>
        ) : null}

        <Input
          label="Previsão de fechamento"
          type="date"
          {...register("forecastDate")}
        />

        <Select
          label="Responsável"
          options={userOptions}
          value={watch("responsibleId") ?? ""}
          onChange={(v) => setValue("responsibleId", v, { shouldValidate: true })}
        />
        {errors.responsibleId ? (
          <p className="-mt-3 text-sm text-[var(--color-red)]">{errors.responsibleId.message}</p>
        ) : null}

        {!deal ? (
          <ContactIdsPicker
            value={createContactIds}
            onChange={setCreateContactIds}
          />
        ) : null}

        {selectedStageType === "lost" && (
          <Select
            label="Motivo da perda"
            options={LOSS_REASONS}
            value={watch("lossReason") ?? ""}
            onChange={(v) => setValue("lossReason", v, { shouldValidate: true })}
            placeholder="Selecione o motivo…"
          />
        )}
      </form>
    </Drawer>
  );
}
