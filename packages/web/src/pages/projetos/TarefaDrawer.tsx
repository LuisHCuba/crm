import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { api, extractData, formatMutationError } from "@/lib/api";
import { useUserOptions } from "@/lib/use-options";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

const PRIORITY_OPTIONS = [
  { value: "", label: "Nenhuma" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

const NO_RESPONSIBLE = "__none__";

const RESPONSIBLE_OPTIONS_HEAD = [{ value: NO_RESPONSIBLE, label: "Nenhum" }];

const taskSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  stageId: z.string().min(1, "Etapa obrigatória"),
  responsibleId: z.string().optional(),
  priority: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  dependsOnTaskId: z.string().optional(),
});

type TaskValues = z.infer<typeof taskSchema>;

type Stage = {
  id: string;
  name: string;
  percentage: number;
  macroGroup: string;
};

type Subtask = {
  id: string;
  title: string;
  responsibleId: string | null;
  stageId: string;
  stageName: string;
  stageMacroGroup: string;
};

type Activity = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  createdAt: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  taskId?: string | null;
  stages: Stage[];
};

function SubtaskRow({
  sub,
  projectId,
  taskId,
  stages,
}: {
  sub: Subtask;
  projectId: string;
  taskId: string;
  stages: Stage[];
}) {
  const queryClient = useQueryClient();

  const updateStage = useMutation({
    mutationFn: (stageId: string) =>
      api.patch(
        `/projetos/${projectId}/tarefas/${taskId}/subtarefas/${sub.id}`,
        { stageId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "tasks", taskId],
      });
    },
  });

  const remove = useMutation({
    mutationFn: () =>
      api.delete(
        `/projetos/${projectId}/tarefas/${taskId}/subtarefas/${sub.id}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "tasks", taskId],
      });
      toast.success("Subtarefa removida");
    },
  });

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2">
      <span className="flex-1 truncate text-sm text-[var(--color-text)]">
        {sub.title}
      </span>
      <Select
        options={stages.map((s) => ({ value: s.id, label: s.name }))}
        value={sub.stageId}
        onChange={(v) => updateStage.mutate(v)}
        className="w-32"
      />
      <button
        type="button"
        onClick={() => remove.mutate()}
        className="text-[var(--color-red)] hover:opacity-70"
        aria-label="Remover subtarefa"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function AddSubtaskInline({
  projectId,
  taskId,
  stages,
}: {
  projectId: string;
  taskId: string;
  stages: Stage[];
}) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");

  const create = useMutation({
    mutationFn: () =>
      api.post(`/projetos/${projectId}/tarefas/${taskId}/subtarefas`, {
        title,
        stageId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "tasks", taskId],
      });
      setTitle("");
      setAdding(false);
      toast.success("Subtarefa criada");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao criar subtarefa", e)),
  });

  if (!adding) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setAdding(true)}
      >
        <Plus className="size-4" /> Adicionar subtarefa
      </Button>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <Input
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1"
      />
      <Select
        options={stages.map((s) => ({ value: s.id, label: s.name }))}
        value={stageId}
        onChange={setStageId}
        className="w-36"
      />
      <Button
        size="sm"
        onClick={() => create.mutate()}
        disabled={!title.trim()}
        loading={create.isPending}
      >
        Salvar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
        Cancelar
      </Button>
    </div>
  );
}

export function TarefaDrawer({
  open,
  onClose,
  projectId,
  taskId,
  stages,
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!taskId;
  const userOptions = useUserOptions();
  const responsibleSelectOptions = [...RESPONSIBLE_OPTIONS_HEAD, ...userOptions];

  const { data: task } = useQuery({
    queryKey: ["projects", projectId, "tasks", taskId],
    queryFn: () =>
      api
        .get(`/projetos/${projectId}/tarefas/${taskId}`)
        .then((r) => r.data),
    enabled: !!taskId,
  });

  const { data: activities } = useQuery({
    queryKey: ["activities", "task", taskId],
    queryFn: () =>
      api
        .get("/atividades", { params: { linkedTaskId: taskId } })
        .then((r) => extractData<Activity>(r)),
    enabled: !!taskId,
  });

  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      stageId: stages[0]?.id ?? "",
      responsibleId: "",
      priority: "",
      plannedStartDate: "",
      plannedEndDate: "",
      dependsOnTaskId: "",
    },
  });

  useEffect(() => {
    if (task && isEdit) {
      form.reset({
        title: task.title,
        description: task.description ?? "",
        stageId: task.stageId,
        responsibleId: task.responsibleId ?? "",
        priority: task.priority ?? "",
        plannedStartDate: task.plannedStartDate ?? "",
        plannedEndDate: task.plannedEndDate ?? "",
        dependsOnTaskId: task.dependsOnTaskId ?? "",
      });
    }
    if (!isEdit) {
      form.reset({
        title: "",
        description: "",
        stageId: stages[0]?.id ?? "",
        responsibleId: "",
        priority: "",
        plannedStartDate: "",
        plannedEndDate: "",
        dependsOnTaskId: "",
      });
    }
  }, [task, isEdit, form, stages]);

  const createTask = useMutation({
    mutationFn: (data: TaskValues) =>
      api.post(`/projetos/${projectId}/tarefas`, {
        title: data.title,
        description: data.description || null,
        stageId: data.stageId,
        responsibleId: data.responsibleId?.trim() || null,
        priority: data.priority || null,
        plannedStartDate: data.plannedStartDate || null,
        plannedEndDate: data.plannedEndDate || null,
        dependsOnTaskId: data.dependsOnTaskId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "tasks"],
      });
      toast.success("Tarefa criada");
      form.reset();
      onClose();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao criar tarefa", e)),
  });

  const updateTask = useMutation({
    mutationFn: (data: TaskValues) =>
      api.patch(`/projetos/${projectId}/tarefas/${taskId}`, {
        title: data.title,
        description: data.description || null,
        stageId: data.stageId,
        responsibleId: data.responsibleId?.trim() || null,
        priority: data.priority || null,
        plannedStartDate: data.plannedStartDate || null,
        plannedEndDate: data.plannedEndDate || null,
        dependsOnTaskId: data.dependsOnTaskId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "tasks"],
      });
      toast.success("Tarefa atualizada");
      onClose();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao atualizar tarefa", e)),
  });

  const isPending = createTask.isPending || updateTask.isPending;
  const responsibleIdW = form.watch("responsibleId");

  function onSubmit(data: TaskValues) {
    if (isEdit) updateTask.mutate(data);
    else createTask.mutate(data);
  }

  const stageOptions = stages.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.percentage}%)`,
  }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar tarefa" : "Nova tarefa"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={isPending} onClick={form.handleSubmit(onSubmit)}>
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
          label="Etapa"
          options={stageOptions}
          value={form.watch("stageId")}
          onChange={(v) =>
            form.setValue("stageId", v, { shouldValidate: true })
          }
        />

        <Select
          label="Responsável"
          options={responsibleSelectOptions}
          value={responsibleIdW?.trim() ? responsibleIdW : NO_RESPONSIBLE}
          onChange={(v) =>
            form.setValue(
              "responsibleId",
              v === NO_RESPONSIBLE ? "" : v,
              { shouldValidate: true },
            )
          }
        />

        <Select
          label="Prioridade"
          options={PRIORITY_OPTIONS}
          value={form.watch("priority") ?? ""}
          onChange={(v) => form.setValue("priority", v)}
        />

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

        <Input
          label="Depende de (ID tarefa)"
          {...form.register("dependsOnTaskId")}
          placeholder="UUID da tarefa"
        />

        {isEdit && task?.subtasks && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
              Subtarefas
            </h3>
            <div className="space-y-2">
              {task.subtasks.map((sub: Subtask) => (
                <SubtaskRow
                  key={sub.id}
                  sub={sub}
                  projectId={projectId}
                  taskId={taskId!}
                  stages={stages}
                />
              ))}
              <AddSubtaskInline
                projectId={projectId}
                taskId={taskId!}
                stages={stages}
              />
            </div>
          </div>
        )}

        {isEdit && activities && activities.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">
              Atividades
            </h3>
            <div className="space-y-2">
              {activities.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {a.title ?? a.type}
                    </span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {format(new Date(a.createdAt), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  {a.body && (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {a.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </Drawer>
  );
}
