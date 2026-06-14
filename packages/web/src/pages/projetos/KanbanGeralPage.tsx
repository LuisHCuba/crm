import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { api, formatMutationError } from "@/lib/api";
import { useReferenceLabels } from "@/lib/use-reference-labels";
import { Badge } from "@/components/ui/Badge";

type MacroGroup =
  | "not_started"
  | "in_progress"
  | "completed"
  | "paused"
  | "cancelled";

const MACRO_COLUMNS: { id: MacroGroup; label: string }[] = [
  { id: "not_started", label: "Não iniciado" },
  { id: "in_progress", label: "Em andamento" },
  { id: "completed", label: "Concluído" },
  { id: "paused", label: "Pausado" },
  { id: "cancelled", label: "Cancelado" },
];

type Task = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  responsibleId: string | null;
  stageId: string;
  stageName: string;
  stageMacroGroup: string;
};

type Stage = {
  id: string;
  name: string;
  macroGroup: string;
};

function DroppableColumn({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] w-72 shrink-0 flex-col rounded-[var(--radius-xl)] border bg-[var(--color-surface-2)] transition-colors ${
        isOver
          ? "border-[var(--color-accent)] ring-2 ring-[color-mix(in_srgb,var(--color-ring)_35%,transparent)]"
          : "border-[var(--color-border)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2.5">
        <span className="truncate text-sm font-semibold text-[var(--color-text)]">
          {label}
        </span>
        <Badge variant="neutral">{count}</Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {count === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-xs text-[var(--color-faint)]">
            Sem tarefas
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onOpen,
  userMap,
}: {
  task: Task;
  onOpen?: () => void;
  userMap: Map<string, string>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none select-none rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-xs)] outline-none transition-shadow hover:shadow-[var(--shadow-sm)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] active:cursor-grabbing"
    >
      <p className="text-sm font-medium text-[var(--color-text)]">
        {task.title}
      </p>
      <p className="mt-1 truncate text-xs font-medium text-[var(--color-accent)]">
        {task.projectTitle}
      </p>
      {task.responsibleId && (
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          {userMap.get(task.responsibleId) ?? "—"}
        </p>
      )}
    </div>
  );
}

export function KanbanGeralPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userMap } = useReferenceLabels();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const { data: taskData, isLoading } = useQuery({
    queryKey: ["all-tasks", { perPage: 100 }],
    queryFn: () =>
      api
        .get("/projetos/tarefas", { params: { perPage: 100 } })
        .then((r) => r.data),
  });

  const tasks: Task[] = taskData?.data ?? [];

  const projectIds = [...new Set(tasks.map((t) => t.projectId))];

  const stageQueries = useQueries({
    queries: projectIds.map((pid) => ({
      queryKey: ["projects", pid, "stages"],
      queryFn: () =>
        api
          .get(`/projetos/${pid}/etapas`)
          .then((r) => r.data as Stage[]),
      staleTime: 60_000,
    })),
  });

  const stagesByProject = new Map<string, Stage[]>();
  projectIds.forEach((pid, i) => {
    if (stageQueries[i]?.data) {
      stagesByProject.set(pid, stageQueries[i].data!);
    }
  });

  const tasksByMacro = new Map<MacroGroup, Task[]>();
  for (const col of MACRO_COLUMNS) tasksByMacro.set(col.id, []);
  for (const t of tasks) {
    const group = t.stageMacroGroup as MacroGroup;
    const arr = tasksByMacro.get(group);
    if (arr) arr.push(t);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const tasksKey = ["all-tasks", { perPage: 100 }] as const;

  const updateTask = useMutation({
    mutationFn: ({
      projectId,
      taskId,
      stageId,
    }: {
      projectId: string;
      taskId: string;
      stageId: string;
      stageMacroGroup: MacroGroup;
      stageName: string;
    }) => api.patch(`/projetos/${projectId}/tarefas/${taskId}`, { stageId }),
    // Update otimista: re-bucketiza o card na coluna de destino na hora.
    onMutate: async (vars) => {
      // Escrita otimista SÍNCRONA (antes de qualquer await) para evitar o flicker.
      const previous = queryClient.getQueryData<{ data: Task[] }>(tasksKey);

      queryClient.setQueryData<{ data: Task[] }>(tasksKey, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((t) =>
            t.id === vars.taskId
              ? {
                  ...t,
                  stageId: vars.stageId,
                  stageMacroGroup: vars.stageMacroGroup,
                  stageName: vars.stageName,
                }
              : t,
          ),
        };
      });

      await queryClient.cancelQueries({ queryKey: tasksKey });
      return { previous };
    },
    onError: (e, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(tasksKey, context.previous);
      toast.error(formatMutationError("Erro ao mover tarefa", e));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
    },
  });

  function handleDragStart(event: { active: { id: string | number } }) {
    const t = tasks.find((t) => t.id === event.active.id);
    setActiveTask(t ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const targetMacro = String(over.id) as MacroGroup;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.stageMacroGroup === targetMacro) return;

    const projectStages = stagesByProject.get(task.projectId);
    if (!projectStages) {
      toast.error("Etapas do projeto não carregadas");
      return;
    }

    const targetStage = projectStages.find(
      (s) => s.macroGroup === targetMacro,
    );
    if (!targetStage) {
      toast.error(
        `Nenhuma etapa com grupo "${MACRO_COLUMNS.find((c) => c.id === targetMacro)?.label}" neste projeto`,
      );
      return;
    }

    updateTask.mutate({
      projectId: task.projectId,
      taskId,
      stageId: targetStage.id,
      stageMacroGroup: targetMacro,
      stageName: targetStage.name,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          Kanban geral
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Arraste as tarefas entre os grupos para atualizar o status.
        </p>
      </div>

      {isLoading ? (
        <div className="flex w-full gap-4 overflow-x-auto pb-4">
          {MACRO_COLUMNS.map((col) => (
            <div
              key={col.id}
              className="h-72 w-72 shrink-0 animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
            />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex min-w-0 w-full gap-4 overflow-x-auto pb-4">
            {MACRO_COLUMNS.map((col) => {
              const colTasks = tasksByMacro.get(col.id) ?? [];
              return (
                <DroppableColumn
                  key={col.id}
                  id={col.id}
                  label={col.label}
                  count={colTasks.length}
                >
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      userMap={userMap}
                      onOpen={() => navigate(`/projetos/${task.projectId}`)}
                    />
                  ))}
                </DroppableColumn>
              );
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="w-64 rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-lg)]">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {activeTask.title}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--color-accent)]">
                  {activeTask.projectTitle}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
