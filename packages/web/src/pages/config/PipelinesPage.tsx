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
      className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
    >
      <button
        type="button"
        className="cursor-grab text-[var(--color-muted)] hover:text-[var(--color-text)]"
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
        className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]"
      />
      <Select
        options={STAGE_TYPE_OPTIONS}
        value={stage.type}
        onChange={(v) => onUpdate({ type: v as "open" | "won" | "lost" })}
        className="w-28"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-[var(--color-red)] hover:opacity-70"
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

  useEffect(() => {
    if (stages) {
      setLocalStages(
        stages.map((s) => ({ ...s, _key: s.id })),
      );
    }
    if (!isEdit) setLocalStages([]);
  }, [stages, isEdit]);

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
      <div className="space-y-4">
        <Input
          label="Nome"
          {...form.register("name")}
          error={form.formState.errors.name?.message}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pipeline-active"
            {...form.register("active")}
            className="size-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
          />
          <label
            htmlFor="pipeline-active"
            className="text-sm text-[var(--color-text)]"
          >
            Ativo
          </label>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
            Etapas
          </h3>
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
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

  const { data, isLoading } = useQuery({
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Pipelines
        </h1>
        <Button
          onClick={() => {
            setSelectedId(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="size-4" /> Novo pipeline
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        getRowKey={(row) => row.id}
        onRowClick={(row) => {
          setSelectedId(row.id);
          setDrawerOpen(true);
        }}
      />

      <PipelineDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pipelineId={selectedId}
      />
    </div>
  );
}
