import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Archive,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
} from "lucide-react";
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
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AuditHistory } from "@/components/AuditHistory";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { ProjetoForm } from "./ProjetoForm";
import { TarefaDrawer } from "./TarefaDrawer";

type Stage = {
  id: string;
  name: string;
  percentage: number;
  macroGroup: string;
  order: number;
};

type Responsible = { id: string; name: string; email: string };

type Project = {
  id: string;
  title: string;
  description: string | null;
  dealId: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  responsibles: Responsible[];
  stages: Stage[];
  progress: number;
  status: string;
  taskCount: number;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  projectId: string;
  responsibleId: string | null;
  stageId: string;
  priority: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  stageName: string;
  stagePercentage: number;
  stageMacroGroup: string;
  subtaskCount: number;
  dependsOnTaskId: string | null;
};

type Subtask = {
  id: string;
  title: string;
  stageId: string;
  stageName: string;
  responsibleId: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  completed: "Concluído",
  overdue: "Atrasado",
};

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  not_started: "neutral",
  in_progress: "info",
  completed: "success",
  overdue: "danger",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const PRIORITY_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "neutral"
> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
};

const TABS = [
  "Kanban",
  "Lista",
  "Timeline",
  "Atividades",
  "Histórico",
] as const;

type Tab = (typeof TABS)[number];

function DroppableColumn({
  id,
  label,
  percentage,
  children,
}: {
  id: string;
  label: string;
  percentage: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[200px] w-72 shrink-0 flex-col rounded-[var(--radius-xl)] border bg-[var(--color-surface-2)] transition-colors ${
        isOver
          ? "border-[var(--color-accent)] ring-2 ring-[color-mix(in_srgb,var(--color-ring)_35%,transparent)]"
          : "border-[var(--color-border)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2.5">
        <span className="truncate text-sm font-semibold text-[var(--color-text)]">
          {label}
        </span>
        <Badge variant="neutral">{percentage}%</Badge>
      </div>
      <div className="flex-1 space-y-2 p-2">{children}</div>
    </div>
  );
}

function DraggableCard({ task, onOpen }: { task: Task; onOpen?: () => void }) {
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
      {task.priority && (
        <Badge
          variant={PRIORITY_VARIANT[task.priority] ?? "neutral"}
          className="mt-2"
        >
          {PRIORITY_LABEL[task.priority] ?? task.priority}
        </Badge>
      )}
    </div>
  );
}

function KanbanTab({
  project,
  tasks,
  onOpenTask,
}: {
  project: Project;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const tasksKey = ["projects", project.id, "tasks"] as const;

  const updateTask = useMutation({
    mutationFn: ({
      taskId,
      stageId,
    }: {
      taskId: string;
      stageId: string;
      stage?: { name: string; percentage: number; macroGroup: string };
    }) =>
      api.patch(`/projetos/${project.id}/tarefas/${taskId}`, { stageId }),
    // Update otimista: move o card para a coluna de destino imediatamente.
    onMutate: async (vars) => {
      // Escrita otimista SÍNCRONA (antes de qualquer await) para evitar o flicker.
      const previous = queryClient.getQueryData<Task[]>(tasksKey);

      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        (old ?? []).map((t) =>
          t.id === vars.taskId
            ? {
                ...t,
                stageId: vars.stageId,
                ...(vars.stage
                  ? {
                      stageName: vars.stage.name,
                      stagePercentage: vars.stage.percentage,
                      stageMacroGroup: vars.stage.macroGroup,
                    }
                  : {}),
              }
            : t,
        ),
      );

      await queryClient.cancelQueries({ queryKey: tasksKey });
      return { previous };
    },
    onError: (e, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(tasksKey, context.previous);
      toast.error(formatMutationError("Erro ao mover tarefa", e));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksKey });
      queryClient.invalidateQueries({ queryKey: ["projects", project.id] });
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
    const newStageId = String(over.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.stageId === newStageId) return;
    const targetStage = project.stages.find((s) => s.id === newStageId);
    updateTask.mutate({
      taskId,
      stageId: newStageId,
      stage: targetStage
        ? {
            name: targetStage.name,
            percentage: targetStage.percentage,
            macroGroup: targetStage.macroGroup,
          }
        : undefined,
    });
  }

  const tasksByStage = new Map<string, Task[]>();
  for (const s of project.stages) tasksByStage.set(s.id, []);
  for (const t of tasks) {
    const arr = tasksByStage.get(t.stageId);
    if (arr) arr.push(t);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-w-0 w-full gap-4 overflow-x-auto pb-4">
        {project.stages.map((stage) => (
          <DroppableColumn
            key={stage.id}
            id={stage.id}
            label={stage.name}
            percentage={stage.percentage}
          >
            {(tasksByStage.get(stage.id) ?? []).map((task) => (
              <DraggableCard
                key={task.id}
                task={task}
                onOpen={() => onOpenTask(task.id)}
              />
            ))}
            {(tasksByStage.get(stage.id) ?? []).length === 0 && (
              <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-xs text-[var(--color-faint)]">
                Sem tarefas
              </p>
            )}
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-64 rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-lg)]">
            <p className="text-sm font-medium text-[var(--color-text)]">
              {activeTask.title}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ListaTab({
  tasks,
  projectId,
  onOpenTask,
}: {
  tasks: Task[];
  projectId: string;
  onOpenTask: (taskId: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[50rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
              <th className="w-8 px-4 py-2.5" />
              <th className="px-4 py-2.5 font-medium">Título</th>
              <th className="px-4 py-2.5 font-medium">Etapa</th>
              <th className="px-4 py-2.5 font-medium">Prioridade</th>
              <th className="px-4 py-2.5 font-medium">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <TaskExpandableRow
                key={t.id}
                task={t}
                projectId={projectId}
                expanded={expanded.has(t.id)}
                onToggle={() => toggleExpand(t.id)}
                onOpen={() => onOpenTask(t.id)}
              />
            ))}
            {tasks.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-[var(--color-muted)]"
                >
                  Nenhuma tarefa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskExpandableRow({
  task,
  projectId,
  expanded,
  onToggle,
  onOpen,
}: {
  task: Task;
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const { data: subtasks } = useQuery({
    queryKey: ["projects", projectId, "tasks", task.id, "subtasks"],
    queryFn: () =>
      api
        .get(`/projetos/${projectId}/tarefas/${task.id}/subtarefas`)
        .then((r) => r.data as Subtask[]),
    enabled: expanded,
  });

  return (
    <>
      <tr className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-hover)]">
        <td className="px-4 py-3">
          {task.subtaskCount > 0 && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={expanded ? "Recolher subtarefas" : "Expandir subtarefas"}
              className="rounded-[var(--radius-sm)] text-[var(--color-muted)] outline-none transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              {expanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          )}
        </td>
        <td
          className="cursor-pointer px-4 py-3 font-medium text-[var(--color-text)]"
          onClick={onOpen}
        >
          {task.title}
        </td>
        <td className="px-4 py-3">
          <Badge variant="info">{task.stageName}</Badge>
        </td>
        <td className="px-4 py-3">
          {task.priority ? (
            <Badge variant={PRIORITY_VARIANT[task.priority] ?? "neutral"}>
              {PRIORITY_LABEL[task.priority] ?? task.priority}
            </Badge>
          ) : (
            <span className="text-[var(--color-faint)]">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-[var(--color-text)]">
          {task.plannedEndDate ? (
            new Date(task.plannedEndDate).toLocaleDateString("pt-BR")
          ) : (
            <span className="text-[var(--color-faint)]">—</span>
          )}
        </td>
      </tr>
      {expanded &&
        subtasks?.map((sub) => (
          <tr
            key={sub.id}
            className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]"
          >
            <td className="px-4 py-2" />
            <td className="px-4 py-2 pl-10 text-sm text-[var(--color-muted)]">
              ↳ {sub.title}
            </td>
            <td className="px-4 py-2">
              <Badge variant="neutral">{sub.stageName}</Badge>
            </td>
            <td className="px-4 py-2" />
            <td className="px-4 py-2" />
          </tr>
        ))}
    </>
  );
}

function TimelineTab({ tasks }: { tasks: Task[] }) {
  const tasksWithDates = tasks.filter(
    (t) => t.plannedStartDate && t.plannedEndDate,
  );

  if (tasksWithDates.length === 0) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center text-sm text-[var(--color-muted)]">
        Nenhuma tarefa com datas planejadas.
      </div>
    );
  }

  const allDates = tasksWithDates.flatMap((t) => [
    new Date(t.plannedStartDate!).getTime(),
    new Date(t.plannedEndDate!).getTime(),
  ]);
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const range = maxDate - minDate || 1;

  return (
    <div className="space-y-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)]">
      <div className="flex justify-between text-xs text-[var(--color-muted)]">
        <span>{new Date(minDate).toLocaleDateString("pt-BR")}</span>
        <span>{new Date(maxDate).toLocaleDateString("pt-BR")}</span>
      </div>
      {tasksWithDates.map((t) => {
        const start = new Date(t.plannedStartDate!).getTime();
        const end = new Date(t.plannedEndDate!).getTime();
        const left = ((start - minDate) / range) * 100;
        const width = Math.max(((end - start) / range) * 100, 1);

        return (
          <div key={t.id} className="relative h-8">
            <div
              className="absolute top-0 flex h-full items-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-2 shadow-[var(--shadow-xs)]"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <span className="truncate text-xs font-medium text-[var(--color-accent-contrast)]">
                {t.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProjetoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("Kanban");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const archiveMutation = useMutation({
    mutationFn: () => api.delete(`/projetos/${id}`),
    onSuccess: () => {
      toast.success("Projeto arquivado");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/projetos");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao arquivar projeto", e)),
  });

  const { data: project, isLoading, isError, refetch } = useQuery<Project>({
    queryKey: ["projects", id],
    queryFn: () => api.get(`/projetos/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["projects", id, "tasks"],
    queryFn: () =>
      api.get(`/projetos/${id}/tarefas`, { params: { perPage: 999 } }).then((r) => r.data.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-2)]" />
        <div className="h-11 w-80 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]" />
        <div className="h-64 animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-2)]" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <QueryErrorState
        message="Projeto não encontrado ou indisponível."
        onRetry={() => refetch()}
      />
    );
  }

  function openTask(taskId: string | null) {
    setSelectedTaskId(taskId);
    setDrawerOpen(true);
  }

  const metaItems: { label: string; value: string }[] = [
    {
      label: "Início planejado",
      value: project.plannedStartDate
        ? new Date(project.plannedStartDate).toLocaleDateString("pt-BR")
        : "—",
    },
    {
      label: "Fim planejado",
      value: project.plannedEndDate
        ? new Date(project.plannedEndDate).toLocaleDateString("pt-BR")
        : "—",
    },
    {
      label: "Início real",
      value: project.actualStartDate
        ? new Date(project.actualStartDate).toLocaleDateString("pt-BR")
        : "—",
    },
    {
      label: "Fim real",
      value: project.actualEndDate
        ? new Date(project.actualEndDate).toLocaleDateString("pt-BR")
        : "—",
    },
    {
      label: "Responsáveis",
      value:
        project.responsibles.length > 0
          ? project.responsibles.map((r) => r.name).join(", ")
          : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)] md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-[var(--color-text)]">
                {project.title}
              </h1>
              <Badge variant={STATUS_VARIANT[project.status] ?? "neutral"}>
                {STATUS_LABEL[project.status] ?? project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Editar projeto
            </Button>
            <Button variant="danger" onClick={() => setConfirmArchive(true)}>
              <Archive className="size-4" /> Arquivar
            </Button>
            <Button onClick={() => openTask(null)}>
              <Plus className="size-4" /> Nova tarefa
            </Button>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <ProgressBar
            value={project.progress}
            className="flex-1"
            color={project.progress >= 100 ? "green" : "accent"}
          />
          <span className="text-sm font-medium text-[var(--color-text)]">
            {Math.round(project.progress)}%
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--color-border)] pt-5 sm:grid-cols-3 lg:grid-cols-5">
          {metaItems.map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                {item.label}
              </span>
              <span className="text-sm text-[var(--color-text)]">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {project.dealId && (
          <div className="mt-4">
            <Link
              to={`/negocios/${project.dealId}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded-[var(--radius-sm)]"
            >
              Ver negócio <ExternalLink className="size-3.5" />
            </Link>
          </div>
        )}
      </div>

      <Tabs
        tabs={TABS.map((tab) => ({ id: tab, label: tab }))}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as Tab)}
      />

      {activeTab === "Kanban" && (
        <KanbanTab
          project={project}
          tasks={tasks ?? []}
          onOpenTask={openTask}
        />
      )}
      {activeTab === "Lista" && (
        <ListaTab
          tasks={tasks ?? []}
          projectId={project.id}
          onOpenTask={openTask}
        />
      )}
      {activeTab === "Timeline" && <TimelineTab tasks={tasks ?? []} />}
      {activeTab === "Atividades" && <ActivityTimeline linkedProjectId={project.id} />}
      {activeTab === "Histórico" && <AuditHistory objectType="project" recordId={project.id} />}

      <TarefaDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTaskId(null);
        }}
        projectId={project.id}
        taskId={selectedTaskId}
        stages={project.stages}
      />

      <ProjetoForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        projectId={project.id}
      />

      <Modal
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Arquivar projeto"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmArchive(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text)]">
          Tem certeza que deseja arquivar o projeto <strong>{project.title}</strong>?
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
