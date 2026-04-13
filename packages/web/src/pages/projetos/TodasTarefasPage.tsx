import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

const MACRO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "not_started", label: "Não iniciado" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
  { value: "paused", label: "Pausado" },
  { value: "cancelled", label: "Cancelado" },
];

const MACRO_LABEL: Record<string, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  completed: "Concluído",
  paused: "Pausado",
  cancelled: "Cancelado",
};

const MACRO_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  not_started: "neutral",
  in_progress: "info",
  completed: "success",
  paused: "warning",
  cancelled: "danger",
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

type Task = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  responsibleId: string | null;
  stageId: string;
  stageName: string;
  stageMacroGroup: string;
  priority: string | null;
  plannedEndDate: string | null;
};

type Subtask = {
  id: string;
  title: string;
  stageName: string;
  responsibleId: string | null;
};

function ExpandableTaskRow({
  task,
  expanded,
  onToggle,
}: {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data: subtasks } = useQuery({
    queryKey: [
      "projects",
      task.projectId,
      "tasks",
      task.id,
      "subtasks",
    ],
    queryFn: () =>
      api
        .get(
          `/projetos/${task.projectId}/tarefas/${task.id}/subtarefas`,
        )
        .then((r) => r.data as Subtask[]),
    enabled: expanded,
  });

  return (
    <>
      <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-accent-soft)]">
        <td className="px-4 py-3">
          <button type="button" onClick={onToggle} aria-label="Expandir subtarefas">
            <ChevronDown
              className={`size-4 text-[var(--color-muted)] transition-transform ${
                expanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
        </td>
        <td className="px-4 py-3 text-sm text-[var(--color-accent)]">
          {task.projectTitle}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-[var(--color-text)]">
          {task.title}
        </td>
        <td className="px-4 py-3 text-sm text-[var(--color-muted)]">
          {task.responsibleId?.slice(0, 8) ?? "—"}
        </td>
        <td className="px-4 py-3">
          <Badge variant={MACRO_VARIANT[task.stageMacroGroup] ?? "neutral"}>
            {task.stageName}
          </Badge>
        </td>
        <td className="px-4 py-3">
          {task.priority ? (
            <Badge variant={PRIORITY_VARIANT[task.priority] ?? "neutral"}>
              {PRIORITY_LABEL[task.priority] ?? task.priority}
            </Badge>
          ) : (
            "—"
          )}
        </td>
        <td className="px-4 py-3 text-sm text-[var(--color-text)]">
          {task.plannedEndDate
            ? new Date(task.plannedEndDate).toLocaleDateString("pt-BR")
            : "—"}
        </td>
      </tr>
      {expanded &&
        subtasks?.map((sub) => (
          <tr
            key={sub.id}
            className="border-b border-[var(--color-border)] bg-[var(--color-bg)]"
          >
            <td className="px-4 py-2" />
            <td className="px-4 py-2" />
            <td className="px-4 py-2 pl-10 text-sm text-[var(--color-muted)]">
              ↳ {sub.title}
            </td>
            <td className="px-4 py-2 text-sm text-[var(--color-muted)]">
              {sub.responsibleId?.slice(0, 8) ?? "—"}
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

export function TodasTarefasPage() {
  const [priority, setPriority] = useState("");
  const [macroGroup, setMacroGroup] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const params: Record<string, string | number> = { page, perPage: 25 };
  if (priority) params.priority = priority;
  if (macroGroup) params.macroGroup = macroGroup;

  const { data, isLoading } = useQuery({
    queryKey: ["all-tasks", params],
    queryFn: () =>
      api.get("/projetos/tarefas", { params }).then((r) => r.data),
  });

  const tasks: Task[] = data?.data ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    perPage: 25,
    total: 0,
    totalPages: 1,
  };

  function toggleExpand(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">
        Todas as tarefas
      </h1>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Prioridade"
          options={PRIORITY_OPTIONS}
          value={priority}
          onChange={(v) => {
            setPriority(v);
            setPage(1);
          }}
          className="w-40"
        />
        <Select
          label="Grupo macro"
          options={MACRO_OPTIONS}
          value={macroGroup}
          onChange={(v) => {
            setMacroGroup(v);
            setPage(1);
          }}
          className="w-44"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">
                  Projeto
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">
                  Título
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">
                  Responsável
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">
                  Etapa
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">
                  Prioridade
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">
                  Prazo
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-[var(--color-muted)]"
                  >
                    Carregando…
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-[var(--color-muted)]"
                  >
                    Nenhuma tarefa.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <ExpandableTaskRow
                    key={task.id}
                    task={task}
                    expanded={expandedRows.has(task.id)}
                    onToggle={() => toggleExpand(task.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          Página {pagination.page} de {pagination.totalPages} (
          {pagination.total} registros)
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
