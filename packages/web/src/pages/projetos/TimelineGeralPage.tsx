import { useQuery } from "@tanstack/react-query";
import { api, extractData } from "@/lib/api";
import { ProgressBar } from "@/components/ui/ProgressBar";

type Project = {
  id: string;
  title: string;
  progress: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
};

type Task = {
  id: string;
  title: string;
  projectId: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  stageMacroGroup: string;
};

function computeGlobalRange(
  projects: Project[],
  tasks: Task[],
): { min: number; max: number } {
  const dates: number[] = [];

  for (const p of projects) {
    if (p.plannedStartDate)
      dates.push(new Date(p.plannedStartDate).getTime());
    if (p.plannedEndDate) dates.push(new Date(p.plannedEndDate).getTime());
  }
  for (const t of tasks) {
    if (t.plannedStartDate)
      dates.push(new Date(t.plannedStartDate).getTime());
    if (t.plannedEndDate) dates.push(new Date(t.plannedEndDate).getTime());
  }

  if (dates.length === 0) {
    const now = Date.now();
    return { min: now, max: now + 86400000 * 30 };
  }

  return { min: Math.min(...dates), max: Math.max(...dates) };
}

function barStyle(
  start: string | null,
  end: string | null,
  range: { min: number; max: number },
): { left: string; width: string } | null {
  if (!start || !end) return null;
  const totalDuration = range.max - range.min || 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const left = ((s - range.min) / totalDuration) * 100;
  const width = Math.max(((e - s) / totalDuration) * 100, 0.5);
  return { left: `${left}%`, width: `${width}%` };
}

const MACRO_COLORS: Record<string, string> = {
  not_started: "var(--color-muted)",
  in_progress: "var(--color-accent)",
  completed: "var(--color-success)",
  paused: "var(--color-warning)",
  cancelled: "var(--color-danger)",
};

export function TimelineGeralPage() {
  const { data: projectData, isLoading: loadingProjects } = useQuery({
    queryKey: ["projects", { perPage: 100 }],
    queryFn: () =>
      api
        .get("/projetos", { params: { perPage: 100 } })
        .then((r) => extractData<Project>(r)),
  });

  const { data: taskData, isLoading: loadingTasks } = useQuery({
    queryKey: ["all-tasks", { perPage: 100 }],
    queryFn: () =>
      api
        .get("/projetos/tarefas", { params: { perPage: 100 } })
        .then((r) => extractData<Task>(r)),
  });

  const projects = projectData ?? [];
  const tasks = taskData ?? [];
  const isLoading = loadingProjects || loadingTasks;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-48 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          Timeline geral
        </h1>
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center text-sm text-[var(--color-muted)]">
          Nenhum projeto encontrado.
        </div>
      </div>
    );
  }

  const globalRange = computeGlobalRange(projects, tasks);

  const tasksByProject = new Map<string, Task[]>();
  for (const t of tasks) {
    const arr = tasksByProject.get(t.projectId) ?? [];
    arr.push(t);
    tasksByProject.set(t.projectId, arr);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          Timeline geral
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Distribuição das tarefas planejadas ao longo do tempo.
        </p>
      </div>

      <div className="flex justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-muted)]">
        <span>{new Date(globalRange.min).toLocaleDateString("pt-BR")}</span>
        <span>{new Date(globalRange.max).toLocaleDateString("pt-BR")}</span>
      </div>

      <div className="space-y-4">
        {projects.map((project) => {
          const projectTasks = tasksByProject.get(project.id) ?? [];
          const tasksWithDates = projectTasks.filter(
            (t) => t.plannedStartDate && t.plannedEndDate,
          );

          return (
            <div
              key={project.id}
              className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="truncate text-sm font-semibold text-[var(--color-text)]">
                  {project.title}
                </span>
                <ProgressBar
                  value={project.progress}
                  className="w-24"
                  color={project.progress >= 100 ? "green" : "accent"}
                />
                <span className="text-xs text-[var(--color-muted)]">
                  {Math.round(project.progress)}%
                </span>
              </div>

              {tasksWithDates.length === 0 ? (
                <p className="py-2 text-xs text-[var(--color-faint)]">
                  Nenhuma tarefa com datas planejadas.
                </p>
              ) : (
                <div className="relative space-y-1">
                  {tasksWithDates.map((t) => {
                    const bs = barStyle(
                      t.plannedStartDate,
                      t.plannedEndDate,
                      globalRange,
                    );
                    if (!bs) return null;
                    return (
                      <div key={t.id} className="relative h-7">
                        <div
                          className="absolute top-0 flex h-full items-center rounded-[var(--radius-md)] px-2 shadow-[var(--shadow-xs)]"
                          style={{
                            left: bs.left,
                            width: bs.width,
                            backgroundColor:
                              MACRO_COLORS[t.stageMacroGroup] ??
                              "var(--color-accent)",
                          }}
                        >
                          <span className="truncate text-xs font-medium text-[var(--color-accent-contrast)]">
                            {t.title}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
