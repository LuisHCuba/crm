import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, formatMutationError } from "@/lib/api";
import { useDealOptions, useUserOptions } from "@/lib/use-options";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuthStore } from "@/stores/auth-store";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const MACRO_OPTIONS = [
  { value: "not_started", label: "Não iniciado" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
  { value: "paused", label: "Pausado" },
  { value: "cancelled", label: "Cancelado" },
];

type MacroGroup =
  | "not_started"
  | "in_progress"
  | "completed"
  | "paused"
  | "cancelled";

const stageRowSchema = z.object({
  _key: z.string(),
  existingId: z.string().optional(),
  name: z.string().min(1, "Nome obrigatório"),
  percentage: z.coerce.number().int().min(0).max(100),
  macroGroup: z.enum([
    "not_started",
    "in_progress",
    "completed",
    "paused",
    "cancelled",
  ]),
});

const formSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  dealId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  responsibleIds: z.array(z.string()).min(1, "Informe ao menos um responsável"),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  stages: z.array(stageRowSchema).min(1, "Adicione ao menos uma etapa"),
});

type FormValues = z.infer<typeof formSchema>;

type Project = {
  id: string;
  title: string;
  description?: string | null;
  dealId?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  responsibles?: { id: string; name: string; email: string }[];
  stages?: {
    id: string;
    name: string;
    percentage: number;
    macroGroup: MacroGroup;
    order: number;
  }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId?: string | null;
};

function SortableStageRow({
  id,
  index,
  register,
  errors,
  watch,
  setValue,
  onRemove,
}: {
  id: string;
  index: number;
  register: any;
  errors: any;
  watch: any;
  setValue: any;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
    >
      <button
        type="button"
        className="mt-2 cursor-grab text-[var(--color-muted)] hover:text-[var(--color-text)]"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="grid flex-1 grid-cols-3 gap-2">
        <Input
          placeholder="Nome da etapa"
          {...register(`stages.${index}.name`)}
          error={errors.stages?.[index]?.name?.message}
        />
        <Input
          type="number"
          placeholder="%"
          {...register(`stages.${index}.percentage`)}
          error={errors.stages?.[index]?.percentage?.message}
        />
        <Select
          options={MACRO_OPTIONS}
          value={watch(`stages.${index}.macroGroup`) ?? ""}
          onChange={(v) =>
            setValue(`stages.${index}.macroGroup`, v as MacroGroup)
          }
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 text-[var(--color-red)] hover:opacity-70"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

const NO_DEAL = "__none__";

function ResponsibleMultiSelect({
  value,
  onChange,
  userOptions,
  existing,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  userOptions: { value: string; label: string }[];
  existing: { id: string; name: string; email: string }[];
}) {
  const labelFor = (id: string) =>
    userOptions.find((o) => o.value === id)?.label ??
    existing.find((u) => u.id === id)?.name ??
    id;
  const available = userOptions.filter((o) => !value.includes(o.value));
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
        Responsáveis
      </label>
      <div className="flex flex-wrap gap-1.5">
        {value.map((uid) => (
          <span
            key={uid}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-accent)]"
          >
            {labelFor(uid)}
            <button
              type="button"
              onClick={() => onChange(value.filter((id) => id !== uid))}
              aria-label={`Remover ${labelFor(uid)}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <Select
        className="mt-2"
        label="Adicionar responsável"
        options={available}
        value=""
        onChange={(id) => onChange([...value, id])}
        placeholder="Selecione para adicionar…"
        disabled={available.length === 0}
      />
    </div>
  );
}

const DEFAULT_STAGES: FormValues["stages"] = [
  {
    _key: crypto.randomUUID(),
    name: "Backlog",
    percentage: 0,
    macroGroup: "not_started",
  },
  {
    _key: crypto.randomUUID(),
    name: "Em andamento",
    percentage: 50,
    macroGroup: "in_progress",
  },
  {
    _key: crypto.randomUUID(),
    name: "Concluído",
    percentage: 100,
    macroGroup: "completed",
  },
];

export function ProjetoForm({ open, onClose, projectId }: Props) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = (currentUser?.id as string) ?? "";
  const userOptions = useUserOptions();
  const dealOptions = useDealOptions();

  const { data: project } = useQuery<Project>({
    queryKey: ["projects", projectId],
    queryFn: () => api.get(`/projetos/${projectId}`).then((r) => r.data),
    enabled: !!projectId,
  });

  const isEdit = !!projectId && !!project;

  const form = useForm({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      dealId: "",
      responsibleIds: currentUserId ? [currentUserId] : [],
      plannedStartDate: "",
      plannedEndDate: "",
      stages: DEFAULT_STAGES,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "stages",
    keyName: "_rhfId",
  });

  useEffect(() => {
    if (isEdit) {
      form.reset({
        title: project.title,
        description: project.description ?? "",
        dealId: project.dealId ?? "",
        responsibleIds: project.responsibles?.map((r) => r.id) ?? [],
        plannedStartDate: project.plannedStartDate ?? "",
        plannedEndDate: project.plannedEndDate ?? "",
        stages:
          project.stages?.map((s) => ({
            _key: s.id,
            existingId: s.id,
            name: s.name,
            percentage: s.percentage,
            macroGroup: s.macroGroup,
          })) ?? DEFAULT_STAGES,
      });
    }
  }, [isEdit, project, form, dealOptions, userOptions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleStageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex((f) => f._key === active.id);
    const newIdx = fields.findIndex((f) => f._key === over.id);
    if (oldIdx !== -1 && newIdx !== -1) move(oldIdx, newIdx);
  }

  const createProject = useMutation({
    mutationFn: async (data: FormValues) => {
      const { stages, ...rest } = data;
      const res = await api.post("/projetos", {
        title: rest.title,
        description: rest.description || null,
        dealId: rest.dealId || null,
        responsibleIds: rest.responsibleIds,
        plannedStartDate: rest.plannedStartDate || null,
        plannedEndDate: rest.plannedEndDate || null,
      });
      const pid = res.data.id;

      const defaultStages: { id: string }[] = await api
        .get(`/projetos/${pid}/etapas`)
        .then((r) => r.data);
      for (const ds of defaultStages) {
        await api.delete(`/projetos/${pid}/etapas/${ds.id}`).catch(() => {});
      }

      for (let i = 0; i < stages.length; i++) {
        await api.post(`/projetos/${pid}/etapas`, {
          name: stages[i].name,
          percentage: stages[i].percentage,
          macroGroup: stages[i].macroGroup,
          order: i,
        });
      }

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado");
      form.reset();
      onClose();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao criar projeto", e)),
  });

  const updateProject = useMutation({
    mutationFn: async (data: FormValues) => {
      const { stages, responsibleIds, ...rest } = data;
      await api.patch(`/projetos/${projectId}`, {
        title: rest.title,
        description: rest.description || null,
        dealId: rest.dealId || null,
        plannedStartDate: rest.plannedStartDate || null,
        plannedEndDate: rest.plannedEndDate || null,
      });

      const currentIds = new Set(project?.responsibles?.map((r) => r.id) ?? []);
      const newIds = new Set(responsibleIds);
      for (const uid of responsibleIds) {
        if (!currentIds.has(uid)) {
          await api.post(`/projetos/${projectId}/responsaveis`, { userId: uid });
        }
      }
      for (const uid of currentIds) {
        if (!newIds.has(uid)) {
          await api.delete(`/projetos/${projectId}/responsaveis/${uid}`);
        }
      }

      const existingStages: { id: string }[] = await api
        .get(`/projetos/${projectId}/etapas`)
        .then((r) => r.data);

      const formStageIds = new Set(
        stages.filter((s) => s.existingId).map((s) => s.existingId),
      );
      for (const es of existingStages) {
        if (!formStageIds.has(es.id)) {
          await api
            .delete(`/projetos/${projectId}/etapas/${es.id}`)
            .catch(() => {});
        }
      }

      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        if (s.existingId) {
          await api.patch(`/projetos/${projectId}/etapas/${s.existingId}`, {
            name: s.name,
            percentage: s.percentage,
            macroGroup: s.macroGroup,
            order: i,
          });
        } else {
          await api.post(`/projetos/${projectId}/etapas`, {
            name: s.name,
            percentage: s.percentage,
            macroGroup: s.macroGroup,
            order: i,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto atualizado");
      onClose();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao atualizar projeto", e)),
  });

  const isPending = createProject.isPending || updateProject.isPending;
  const dealIdW = form.watch("dealId");

  function onSubmit(data: FormValues) {
    if (isEdit) updateProject.mutate(data);
    else createProject.mutate(data);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar projeto" : "Novo projeto"}
      className="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={isPending}
            onClick={form.handleSubmit(onSubmit as any, (errors) => {
              console.error("Validation:", errors);
              toast.error("Corrija os campos");
            })}
          >
            {isEdit ? "Salvar" : "Criar"}
          </Button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Input
          label="Título"
          {...form.register("title")}
          error={form.formState.errors.title?.message}
        />
        <div className="w-full">
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
            Descrição
          </label>
          <textarea
            {...form.register("description")}
            rows={3}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-accent)]"
          />
        </div>

        <Select
          label="Negócio vinculado"
          options={[{ value: NO_DEAL, label: "Nenhum" }, ...dealOptions]}
          value={dealIdW ? dealIdW : NO_DEAL}
          onChange={(v) =>
            form.setValue("dealId", v === NO_DEAL ? "" : v, {
              shouldValidate: true,
            })
          }
          placeholder="Selecione…"
        />

        <ResponsibleMultiSelect
          value={form.watch("responsibleIds")}
          onChange={(ids) =>
            form.setValue("responsibleIds", ids, { shouldValidate: true })
          }
          userOptions={userOptions}
          existing={project?.responsibles ?? []}
        />
        {form.formState.errors.responsibleIds?.message && (
          <p className="text-sm text-[var(--color-red)]">
            {form.formState.errors.responsibleIds.message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Início planejado"
            {...form.register("plannedStartDate")}
          />
          <Input
            type="date"
            label="Fim planejado"
            {...form.register("plannedEndDate")}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
            Etapas
          </h3>
          {form.formState.errors.stages?.message && (
            <p className="mb-2 text-sm text-[var(--color-red)]">
              {form.formState.errors.stages.message}
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleStageDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f._key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <SortableStageRow
                    key={field._key}
                    id={field._key}
                    index={idx}
                    register={form.register}
                    errors={form.formState.errors}
                    watch={form.watch}
                    setValue={form.setValue}
                    onRemove={() => remove(idx)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() =>
              append({
                _key: crypto.randomUUID(),
                name: "",
                percentage: 0,
                macroGroup: "not_started",
              })
            }
          >
            <Plus className="size-4" /> Adicionar etapa
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
