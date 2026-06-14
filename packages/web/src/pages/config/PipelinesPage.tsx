import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2 } from "lucide-react";
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
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

const STAGE_TYPE_OPTIONS = [
  { value: "open", label: "Aberta" },
  { value: "won", label: "Ganha" },
  { value: "lost", label: "Perdida" },
];

type Pipeline = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
};

type PipelineStage = {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  type: "open" | "won" | "lost";
};

type LocalStage = PipelineStage & { _key: string; isNew?: boolean };

function SortableStage({
  stage,
  onUpdate,
  onRemove,
}: {
  stage: LocalStage;
  onUpdate: (partial: Partial<LocalStage>) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage._key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 ${
        isDragging ? "shadow-[var(--shadow-md)]" : "shadow-[var(--shadow-xs)]"
      }`}
    >
      <button
        type="button"
        aria-label="Reordenar etapa"
        className="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-[var(--radius-md)] text-[var(--color-faint)] outline-none transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <input
        value={stage.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Nome da etapa"
        aria-label="Nome da etapa"
        className="h-9 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 text-sm text-[var(--color-text)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--color-faint)] focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-ring)_35%,transparent)]"
      />
      <Select
        options={STAGE_TYPE_OPTIONS}
        value={stage.type}
        onChange={(v) => onUpdate({ type: v as "open" | "won" | "lost" })}
        className="w-32 shrink-0"
      />
      <button
        type="button"
        onClick={onRemove}
        className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] outline-none transition-colors hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        aria-label="Remover etapa"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function PipelineDrawer({
  open,
  onClose,
  pipelineId,
}: {
  open: boolean;
  onClose: () => void;
  pipelineId: string | null;
}) {
  const queryClient = useQueryClient();
  const [localStages, setLocalStages] = useState<LocalStage[]>([]);
  const isEdit = !!pipelineId;

  const nameSchema = z.object({
    name: z.string().min(1, "Nome obrigatório"),
    active: z.boolean(),
  });

  const form = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "", active: true },
  });

  const { data: pipeline } = useQuery({
    queryKey: ["pipelines", pipelineId],
    queryFn: () =>
      api.get(`/pipelines/${pipelineId}`).then((r) => r.data as Pipeline),
    enabled: !!pipelineId,
  });

  const { data: stages } = useQuery({
    queryKey: ["pipelines", pipelineId, "stages"],
    queryFn: () =>
      api
        .get(`/pipelines/${pipelineId}/stages`)
        .then((r) => r.data as PipelineStage[]),
    enabled: !!pipelineId,
  });

  useEffect(() => {
    if (isEdit && pipeline) {
      form.reset({ name: pipeline.name, active: pipeline.active });
    }
    if (!isEdit) {
      form.reset({ name: "", active: true });
    }
  }, [isEdit, pipeline, form]);

  const [stagesSync, setStagesSync] = useState<{
    stages: PipelineStage[] | undefined;
    isEdit: boolean;
  }>({ stages: undefined, isEdit });
  if (stagesSync.stages !== stages || stagesSync.isEdit !== isEdit) {
    setStagesSync({ stages, isEdit });
    if (stages) {
      setLocalStages(stages.map((s) => ({ ...s, _key: s.id })));
    }
    if (!isEdit) {
      setLocalStages([]);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalStages((prev) => {
      const oldIdx = prev.findIndex((s) => s._key === active.id);
      const newIdx = prev.findIndex((s) => s._key === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  const saveMutation = useMutation({
    mutationFn: async (data: z.infer<typeof nameSchema>) => {
      let pid = pipelineId;

      if (isEdit) {
        await api.patch(`/pipelines/${pid}`, data);
      } else {
        const res = await api.post("/pipelines", data);
        pid = res.data.id;
      }

      if (isEdit && stages) {
        const existingIds = new Set(localStages.filter((s) => !s.isNew).map((s) => s.id));
        for (const s of stages) {
          if (!existingIds.has(s.id)) {
            await api.delete(`/pipelines/${pid}/stages/${s.id}`).catch(() => {});
          }
        }
      }

      const newIdMap = new Map<string, string>();
      for (const s of localStages) {
        if (s.isNew) {
          const res = await api.post(`/pipelines/${pid}/stages`, {
            name: s.name,
            order: localStages.indexOf(s),
            type: s.type,
          });
          newIdMap.set(s._key, res.data.id);
        }
      }

      const allStageIds = localStages.map((s) =>
        s.isNew ? newIdMap.get(s._key)! : s.id,
      );

      if (allStageIds.length > 0) {
        const reorder = allStageIds.map((id, i) => ({ id, order: i }));
        await api.patch(`/pipelines/${pid}/stages/reorder`, {
          stages: reorder,
        });
      }

      if (isEdit) {
        for (const s of localStages.filter((s) => !s.isNew)) {
          const orig = stages?.find((os) => os.id === s.id);
          if (orig && (orig.name !== s.name || orig.type !== s.type)) {
            await api.patch(`/pipelines/${pid}/stages/${s.id}`, {
              name: s.name,
              type: s.type,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["pipelines-options"] });
      toast.success(isEdit ? "Pipeline atualizado" : "Pipeline criado");
      onClose();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao salvar pipeline", e)),
  });

  function addStage() {
    setLocalStages((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        id: crypto.randomUUID(),
        pipelineId: pipelineId ?? "",
        name: "",
        order: prev.length,
        type: "open",
        isNew: true,
      },
    ]);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar pipeline" : "Novo pipeline"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={saveMutation.isPending}
            onClick={form.handleSubmit((d) => saveMutation.mutate(d))}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Input
          label="Nome"
          {...form.register("name")}
          error={form.formState.errors.name?.message}
        />
        <label
          htmlFor="pipeline-active"
          className="flex items-center gap-2.5 text-sm text-[var(--color-text)]"
        >
          <input
            type="checkbox"
            id="pipeline-active"
            {...form.register("active")}
            className="size-4 rounded-[var(--radius-xs)] border-[var(--color-border-strong)] accent-[var(--color-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          />
          Pipeline ativo
        </label>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Etapas
            </h3>
            {localStages.length > 0 && (
              <span className="text-xs text-[var(--color-muted)]">
                {localStages.length}
              </span>
            )}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localStages.map((s) => s._key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localStages.map((stage) => (
                  <SortableStage
                    key={stage._key}
                    stage={stage}
                    onUpdate={(partial) =>
                      setLocalStages((prev) =>
                        prev.map((s) =>
                          s._key === stage._key ? { ...s, ...partial } : s,
                        ),
                      )
                    }
                    onRemove={() =>
                      setLocalStages((prev) =>
                        prev.filter((s) => s._key !== stage._key),
                      )
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {localStages.length === 0 && (
            <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-4 py-6 text-center text-xs text-[var(--color-muted)]">
              Nenhuma etapa ainda. Adicione a primeira abaixo.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={addStage}
          >
            <Plus className="size-4" /> Adicionar etapa
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export function PipelinesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () =>
      api.get("/pipelines").then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as Pipeline[]),
  });

  const columns: DataTableColumn<Pipeline>[] = [
    { key: "name", header: "Nome" },
    {
      key: "active",
      header: "Ativo",
      render: (row) => (
        <Badge variant={row.active ? "success" : "neutral"}>
          {row.active ? "Sim" : "Não"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Criado em",
      render: (row) =>
        new Date(row.createdAt).toLocaleDateString("pt-BR"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl">
            Pipelines
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Gerencie os funis de vendas e organize as etapas de cada um.
          </p>
        </div>
        <Button
          className="shrink-0"
          onClick={() => {
            setSelectedId(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="size-4" /> Novo pipeline
        </Button>
      </div>

      {isError ? (
        <QueryErrorState
          message="Não foi possível carregar os pipelines."
          onRetry={() => refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          getRowKey={(row) => row.id}
          emptyMessage="Nenhum pipeline cadastrado ainda."
          onRowClick={(row) => {
            setSelectedId(row.id);
            setDrawerOpen(true);
          }}
        />
      )}

      <PipelineDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pipelineId={selectedId}
      />
    </div>
  );
}
