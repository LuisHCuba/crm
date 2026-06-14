import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  ListChecks,
} from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

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

type TaskItem = {
  id: string;
  title: string;
  stageName: string;
  stageMacroGroup: string;
  plannedEndDate?: string | null;
  priority?: string | null;
};

type SubtaskItem = TaskItem & {
  parentTaskTitle: string;
};

type ProjectGroup = {
  projectId: string;
  projectTitle: string;
  tasks: TaskItem[];
  subtasks: SubtaskItem[];
};

function isOverdue(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function MinhasTarefasPage() {
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(
    new Set(),
  );

  const { data: groups, isLoading } = useQuery<ProjectGroup[]>({
    queryKey: ["my-tasks"],
    queryFn: () =>
      api.get("/projetos/minhas-tarefas").then((r) => r.data),
  });

  function toggleCollapse(pid: string) {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  const allTasks = groups?.flatMap((g) => g.tasks) ?? [];
  const allSubtasks = groups?.flatMap((g) => g.subtasks) ?? [];
  const allItems = [...allTasks, ...allSubtasks];

  const pending = allItems.filter(
    (t) =>
      t.stageMacroGroup === "not_started" ||
      t.stageMacroGroup === "paused",
  ).length;
  const inProgress = allItems.filter(
    (t) => t.stageMacroGroup === "in_progress",
  ).length;
  const overdue = allItems.filter(
    (t) =>
      isOverdue(t.plannedEndDate) && t.stageMacroGroup !== "completed",
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-48 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          Minhas tarefas
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Tarefas atribuídas a você, agrupadas por projeto.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-warning-soft)]">
            <Clock className="size-5 text-[var(--color-warning)]" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-[var(--color-text)]">
              {pending}
            </p>
            <p className="text-sm text-[var(--color-muted)]">Pendentes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-info-soft)]">
            <ListChecks className="size-5 text-[var(--color-info)]" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-[var(--color-text)]">
              {inProgress}
            </p>
            <p className="text-sm text-[var(--color-muted)]">Em andamento</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-danger-soft)]">
            <AlertTriangle className="size-5 text-[var(--color-danger)]" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-[var(--color-text)]">
              {overdue}
            </p>
            <p className="text-sm text-[var(--color-muted)]">Atrasadas</p>
          </div>
        </div>
      </div>

      {!groups || groups.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center text-sm text-[var(--color-muted)]">
          Nenhuma tarefa atribuída a você.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const collapsed = collapsedProjects.has(group.projectId);
            return (
              <div
                key={group.projectId}
                className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]"
              >
                <button
                  type="button"
                  onClick={() => toggleCollapse(group.projectId)}
                  aria-expanded={!collapsed}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
                >
                  {collapsed ? (
                    <ChevronRight className="size-4 text-[var(--color-muted)]" />
                  ) : (
                    <ChevronDown className="size-4 text-[var(--color-muted)]" />
                  )}
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    {group.projectTitle}
                  </span>
                  <Badge variant="neutral">
                    {group.tasks.length + group.subtasks.length}
                  </Badge>
                </button>

                {!collapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)] text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                          <th className="px-4 py-2 font-medium">Título</th>
                          <th className="px-4 py-2 font-medium">Etapa</th>
                          <th className="px-4 py-2 font-medium">Prazo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.tasks.map((t) => (
                          <tr
                            key={t.id}
                            className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-hover)]"
                          >
                            <td className="px-4 py-2 text-[var(--color-text)]">
                              {t.title}
                            </td>
                            <td className="px-4 py-2">
                              <Badge
                                variant={
                                  MACRO_VARIANT[t.stageMacroGroup] ?? "neutral"
                                }
                              >
                                {t.stageName}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-[var(--color-text)]">
                              {t.plannedEndDate ? (
                                <span
                                  className={
                                    isOverdue(t.plannedEndDate) &&
                                    t.stageMacroGroup !== "completed"
                                      ? "font-medium text-[var(--color-danger)]"
                                      : ""
                                  }
                                >
                                  {new Date(
                                    t.plannedEndDate,
                                  ).toLocaleDateString("pt-BR")}
                                </span>
                              ) : (
                                <span className="text-[var(--color-faint)]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {group.subtasks.map((s) => (
                          <tr
                            key={s.id}
                            className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]"
                          >
                            <td className="px-4 py-2 pl-8 text-[var(--color-muted)]">
                              ↳ {s.title}{" "}
                              <span className="text-xs">
                                ({s.parentTaskTitle})
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <Badge variant="neutral">{s.stageName}</Badge>
                            </td>
                            <td className="px-4 py-2" />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
