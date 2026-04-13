import { FastifyRequest, FastifyReply } from "fastify";
import {
  and,
  count,
  eq,
  sql,
  asc,
  inArray,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import { db } from "../../db/connection";
import {
  projects,
  projectResponsibles,
  projectStages,
  projectTasks,
  projectSubtasks,
  users,
} from "../../db/schema";
import { logAudit, logChanges } from "../../lib/audit";
import { buildFilters } from "../../lib/filters";
import {
  parsePagination,
  paginationOffset,
  paginationMeta,
} from "../../lib/pagination";
import { notArchived, archiveRecord, restoreRecord } from "../../lib/soft-delete";
import {
  createProjectSchema,
  updateProjectSchema,
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema,
} from "./projeto.schemas";

async function computeProjectProgress(projectId: string): Promise<number> {
  const tasks = await db
    .select({
      taskId: projectTasks.id,
      stagePercentage: projectStages.percentage,
    })
    .from(projectTasks)
    .innerJoin(projectStages, eq(projectTasks.stageId, projectStages.id))
    .where(and(eq(projectTasks.projectId, projectId), notArchived(projectTasks)));

  if (tasks.length === 0) return 0;

  const taskIds = tasks.map((t) => t.taskId);

  const subtasks = await db
    .select({
      taskId: projectSubtasks.taskId,
      stagePercentage: projectStages.percentage,
    })
    .from(projectSubtasks)
    .innerJoin(projectStages, eq(projectSubtasks.stageId, projectStages.id))
    .where(and(inArray(projectSubtasks.taskId, taskIds), notArchived(projectSubtasks)));

  const subtasksByTask = new Map<string, number[]>();
  for (const st of subtasks) {
    const arr = subtasksByTask.get(st.taskId) ?? [];
    arr.push(st.stagePercentage);
    subtasksByTask.set(st.taskId, arr);
  }

  let totalProgress = 0;
  for (const task of tasks) {
    const subs = subtasksByTask.get(task.taskId);
    if (subs && subs.length > 0) {
      totalProgress += subs.reduce((a, b) => a + b, 0) / subs.length;
    } else {
      totalProgress += task.stagePercentage;
    }
  }

  return Math.round((totalProgress / tasks.length) * 100) / 100;
}

function computeStatus(
  progress: number,
  plannedEndDate: string | null,
  taskCount: number
): string {
  if (taskCount === 0) return "not_started";
  if (progress >= 100) return "completed";
  if (
    plannedEndDate &&
    new Date(plannedEndDate) < new Date() &&
    progress < 100
  ) {
    return "overdue";
  }
  if (progress > 0) return "in_progress";
  return "not_started";
}

export async function list(
  request: FastifyRequest<{ Querystring: Record<string, unknown> }>,
  reply: FastifyReply
) {
  const paginationParams = parsePagination(request.query);
  const { responsibleId, macroGroup } = request.query as Record<string, string | undefined>;

  const filterConds = buildFilters(request.query, []);
  const parts: SQL[] = [notArchived(projects), ...filterConds];

  if (responsibleId) {
    const projectIds = await db
      .select({ projectId: projectResponsibles.projectId })
      .from(projectResponsibles)
      .where(eq(projectResponsibles.userId, responsibleId));
    const ids = projectIds.map((r) => r.projectId);
    if (ids.length === 0) {
      return reply.send({
        data: [],
        pagination: paginationMeta(0, paginationParams),
      });
    }
    parts.push(inArray(projects.id, ids));
  }

  const whereClause = parts.length === 1 ? parts[0]! : and(...parts)!;

  const allRows = await db
    .select()
    .from(projects)
    .where(whereClause);

  if (allRows.length === 0) {
    return reply.send({
      data: [],
      pagination: paginationMeta(0, paginationParams),
    });
  }

  const projectIds = allRows.map((p) => p.id);

  const taskCountRows = await db
    .select({
      projectId: projectTasks.projectId,
      taskCount: count(),
    })
    .from(projectTasks)
    .where(and(inArray(projectTasks.projectId, projectIds), notArchived(projectTasks)))
    .groupBy(projectTasks.projectId);

  const taskCountMap = new Map<string, number>();
  for (const row of taskCountRows) {
    taskCountMap.set(row.projectId, Number(row.taskCount));
  }

  const taskStageRows = await db
    .select({
      projectId: projectTasks.projectId,
      taskId: projectTasks.id,
      stagePercentage: projectStages.percentage,
    })
    .from(projectTasks)
    .innerJoin(projectStages, eq(projectTasks.stageId, projectStages.id))
    .where(and(inArray(projectTasks.projectId, projectIds), notArchived(projectTasks)));

  const taskIdsByProject = new Map<string, Array<{ taskId: string; stagePercentage: number }>>();
  const allTaskIds: string[] = [];
  for (const row of taskStageRows) {
    const arr = taskIdsByProject.get(row.projectId) ?? [];
    arr.push({ taskId: row.taskId, stagePercentage: row.stagePercentage });
    taskIdsByProject.set(row.projectId, arr);
    allTaskIds.push(row.taskId);
  }

  const subtaskStageRows = allTaskIds.length > 0
    ? await db
        .select({
          taskId: projectSubtasks.taskId,
          stagePercentage: projectStages.percentage,
        })
        .from(projectSubtasks)
        .innerJoin(projectStages, eq(projectSubtasks.stageId, projectStages.id))
        .where(and(inArray(projectSubtasks.taskId, allTaskIds), notArchived(projectSubtasks)))
    : [];

  const subtasksByTask = new Map<string, number[]>();
  for (const st of subtaskStageRows) {
    const arr = subtasksByTask.get(st.taskId) ?? [];
    arr.push(st.stagePercentage);
    subtasksByTask.set(st.taskId, arr);
  }

  const enriched = allRows.map((p) => {
    const tasks = taskIdsByProject.get(p.id) ?? [];
    const tc = taskCountMap.get(p.id) ?? 0;

    let progress = 0;
    if (tasks.length > 0) {
      let totalProgress = 0;
      for (const task of tasks) {
        const subs = subtasksByTask.get(task.taskId);
        if (subs && subs.length > 0) {
          totalProgress += subs.reduce((a, b) => a + b, 0) / subs.length;
        } else {
          totalProgress += task.stagePercentage;
        }
      }
      progress = Math.round((totalProgress / tasks.length) * 100) / 100;
    }

    const status = computeStatus(progress, p.plannedEndDate, tc);
    return { ...p, progress, status, taskCount: tc };
  });

  const filtered = macroGroup
    ? enriched.filter((p) => p.status === macroGroup)
    : enriched;

  const total = filtered.length;
  const offset = paginationOffset(paginationParams);
  const page = filtered.slice(offset, offset + paginationParams.perPage);

  return reply.send({
    data: page,
    pagination: paginationMeta(total, paginationParams),
  });
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), notArchived(projects)))
    .limit(1);

  if (!project) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Projeto não encontrado" });
  }

  const responsibles = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(projectResponsibles)
    .innerJoin(users, eq(projectResponsibles.userId, users.id))
    .where(eq(projectResponsibles.projectId, id));

  const stages = await db
    .select()
    .from(projectStages)
    .where(eq(projectStages.projectId, id))
    .orderBy(asc(projectStages.order));

  const [{ taskCount }] = await db
    .select({ taskCount: count() })
    .from(projectTasks)
    .where(and(eq(projectTasks.projectId, id), notArchived(projectTasks)));

  const progress = await computeProjectProgress(id);
  const status = computeStatus(progress, project.plannedEndDate, Number(taskCount));

  return reply.send({
    ...project,
    responsibles,
    stages,
    taskCount: Number(taskCount),
    progress,
    status,
  });
}

export async function create(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string };

  const parsed = createProjectSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const { responsibleIds, ...projectData } = parsed.data;

  const [inserted] = await db
    .insert(projects)
    .values(projectData)
    .returning();

  await db.insert(projectResponsibles).values(
    responsibleIds.map((userId) => ({
      projectId: inserted.id,
      userId,
    }))
  );

  await db.insert(projectStages).values([
    {
      projectId: inserted.id,
      name: "Backlog",
      percentage: 0,
      macroGroup: "not_started",
      order: 0,
    },
    {
      projectId: inserted.id,
      name: "Em andamento",
      percentage: 50,
      macroGroup: "in_progress",
      order: 1,
    },
    {
      projectId: inserted.id,
      name: "Concluído",
      percentage: 100,
      macroGroup: "completed",
      order: 2,
    },
  ]);

  await logAudit({
    userId: user.id,
    objectType: "project",
    recordId: inserted.id,
    action: "created",
  });

  return reply.status(201).send(inserted);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string };
  const { id } = request.params;

  const parsed = updateProjectSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), notArchived(projects)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Projeto não encontrado" });
  }

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) patch[key] = value;
  }

  if (Object.keys(patch).length === 0) return existing;

  const [updated] = await db
    .update(projects)
    .set(patch as Partial<InferInsertModel<typeof projects>>)
    .where(eq(projects.id, id))
    .returning();

  const oldData: Record<string, unknown> = {};
  const newData: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    oldData[key] = (existing as Record<string, unknown>)[key];
    newData[key] = patch[key];
  }

  await logChanges({
    userId: user.id,
    objectType: "project",
    recordId: id,
    oldData,
    newData,
  });

  return updated;
}

export async function archive(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string };
  const { id } = request.params;

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), notArchived(projects)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Projeto não encontrado" });
  }

  await archiveRecord(projects, id, user.id, "project");
  return reply.status(204).send();
}

export async function restore(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string };
  const { id } = request.params;

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.archived, true)))
    .limit(1);

  if (!existing) {
    return reply
      .status(404)
      .send({ error: "NOT_FOUND", message: "Projeto não encontrado ou não arquivado" });
  }

  await restoreRecord(projects, id, user.id, "project");

  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), notArchived(projects)))
    .limit(1);

  return row;
}

export async function addResponsible(
  request: FastifyRequest<{ Params: { id: string }; Body: { userId: string } }>,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string };
  const { id } = request.params;
  const { userId } = request.body as { userId: string };

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), notArchived(projects)))
    .limit(1);

  if (!project) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Projeto não encontrado" });
  }

  const [existing] = await db
    .select()
    .from(projectResponsibles)
    .where(
      and(
        eq(projectResponsibles.projectId, id),
        eq(projectResponsibles.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    return reply.status(409).send({ error: "CONFLICT", message: "Responsável já vinculado" });
  }

  await db.insert(projectResponsibles).values({ projectId: id, userId });

  await logAudit({
    userId: user.id,
    objectType: "project",
    recordId: id,
    action: "updated",
    field: "responsibles",
    newValue: userId,
  });

  return reply.status(201).send({ projectId: id, userId });
}

export async function removeResponsible(
  request: FastifyRequest<{ Params: { id: string; userId: string } }>,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string };
  const { id, userId } = request.params;

  const [row] = await db
    .select()
    .from(projectResponsibles)
    .where(
      and(
        eq(projectResponsibles.projectId, id),
        eq(projectResponsibles.userId, userId)
      )
    )
    .limit(1);

  if (!row) {
    return reply
      .status(404)
      .send({ error: "NOT_FOUND", message: "Responsável não encontrado" });
  }

  await db
    .delete(projectResponsibles)
    .where(
      and(
        eq(projectResponsibles.projectId, id),
        eq(projectResponsibles.userId, userId)
      )
    );

  await logAudit({
    userId: user.id,
    objectType: "project",
    recordId: id,
    action: "updated",
    field: "responsibles",
    oldValue: userId,
  });

  return reply.status(204).send();
}

export async function listStages(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), notArchived(projects)))
    .limit(1);

  if (!project) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Projeto não encontrado" });
  }

  const stages = await db
    .select()
    .from(projectStages)
    .where(eq(projectStages.projectId, id))
    .orderBy(asc(projectStages.order));

  return stages;
}

export async function createStage(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string };
  const { id } = request.params;

  const parsed = createStageSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), notArchived(projects)))
    .limit(1);

  if (!project) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Projeto não encontrado" });
  }

  const [inserted] = await db
    .insert(projectStages)
    .values({ ...parsed.data, projectId: id })
    .returning();

  await logAudit({
    userId: user.id,
    objectType: "project_stage",
    recordId: inserted.id,
    action: "created",
  });

  return reply.status(201).send(inserted);
}

export async function updateStage(
  request: FastifyRequest<{ Params: { id: string; stageId: string } }>,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string };
  const { id, stageId } = request.params;

  const parsed = updateStageSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const [existing] = await db
    .select()
    .from(projectStages)
    .where(and(eq(projectStages.id, stageId), eq(projectStages.projectId, id)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Etapa não encontrada" });
  }

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) patch[key] = value;
  }

  if (Object.keys(patch).length === 0) return existing;

  const [updated] = await db
    .update(projectStages)
    .set(patch as any)
    .where(eq(projectStages.id, stageId))
    .returning();

  await logAudit({
    userId: user.id,
    objectType: "project_stage",
    recordId: stageId,
    action: "updated",
  });

  return updated;
}

export async function deleteStage(
  request: FastifyRequest<{ Params: { id: string; stageId: string } }>,
  reply: FastifyReply
) {
  const { id, stageId } = request.params;

  const [existing] = await db
    .select()
    .from(projectStages)
    .where(and(eq(projectStages.id, stageId), eq(projectStages.projectId, id)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Etapa não encontrada" });
  }

  const [tasksUsingStage] = await db
    .select({ total: count() })
    .from(projectTasks)
    .where(eq(projectTasks.stageId, stageId));

  if (Number(tasksUsingStage.total) > 0) {
    return reply.status(409).send({
      error: "CONFLICT",
      message: "Existem tarefas vinculadas a esta etapa",
    });
  }

  const [subtasksUsingStage] = await db
    .select({ total: count() })
    .from(projectSubtasks)
    .where(eq(projectSubtasks.stageId, stageId));

  if (Number(subtasksUsingStage.total) > 0) {
    return reply.status(409).send({
      error: "CONFLICT",
      message: "Existem subtarefas vinculadas a esta etapa",
    });
  }

  await db.delete(projectStages).where(eq(projectStages.id, stageId));

  const user = request.user as { id: string };
  await logAudit({
    userId: user.id,
    objectType: "project_stage",
    recordId: stageId,
    action: "archived",
  });

  return reply.status(204).send();
}

export async function reorderStages(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  const parsed = reorderStagesSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  for (const stage of parsed.data.stages) {
    await db
      .update(projectStages)
      .set({ order: stage.order })
      .where(and(eq(projectStages.id, stage.id), eq(projectStages.projectId, id)));
  }

  const user = request.user as { id: string };
  await logAudit({
    userId: user.id,
    objectType: "project",
    recordId: id,
    action: "updated",
    field: "stage_order",
  });

  const stages = await db
    .select()
    .from(projectStages)
    .where(eq(projectStages.projectId, id))
    .orderBy(asc(projectStages.order));

  return stages;
}
