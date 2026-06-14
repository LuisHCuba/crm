import { FastifyRequest, FastifyReply } from "fastify";
import {
  and,
  count,
  eq,
  asc,
  inArray,
  or,
  sql,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import { db } from "../../db/connection";
import {
  projects,
  projectTasks,
  projectSubtasks,
  projectStages,
} from "../../db/schema";
import { logAudit, logChanges } from "../../lib/audit";
import { handleError } from "../../lib/errors";
import { buildFilters } from "../../lib/filters";
import {
  parsePagination,
  paginationOffset,
  paginationMeta,
} from "../../lib/pagination";
import { notArchived, archiveRecord, restoreRecord } from "../../lib/soft-delete";
import {
  createTaskSchema,
  updateTaskSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
} from "./tarefa.schemas";

export async function list(
  request: FastifyRequest<{
    Params: { projectId: string };
    Querystring: Record<string, unknown>;
  }>,
  reply: FastifyReply
) {
  try {
    const { projectId } = request.params;

    const filterConds = buildFilters(request.query, [
      { field: projectTasks.stageId, type: "eq", param: "stageId" },
      { field: projectTasks.responsibleId, type: "eq", param: "responsibleId" },
      { field: projectTasks.priority, type: "eq", param: "priority" },
    ]);

    const parts: SQL[] = [
      eq(projectTasks.projectId, projectId),
      notArchived(projectTasks),
      ...filterConds,
    ];
    const whereClause = parts.length === 1 ? parts[0]! : and(...parts)!;

    const paginationParams = parsePagination(request.query);
    const offset = paginationOffset(paginationParams);

    const [{ total }] = await db
      .select({ total: count() })
      .from(projectTasks)
      .innerJoin(projectStages, eq(projectTasks.stageId, projectStages.id))
      .where(whereClause);

    const rows = await db
      .select({
        id: projectTasks.id,
        title: projectTasks.title,
        description: projectTasks.description,
        projectId: projectTasks.projectId,
        responsibleId: projectTasks.responsibleId,
        stageId: projectTasks.stageId,
        priority: projectTasks.priority,
        plannedStartDate: projectTasks.plannedStartDate,
        plannedEndDate: projectTasks.plannedEndDate,
        actualStartDate: projectTasks.actualStartDate,
        actualEndDate: projectTasks.actualEndDate,
        dependsOnTaskId: projectTasks.dependsOnTaskId,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
        archived: projectTasks.archived,
        stageName: projectStages.name,
        stagePercentage: projectStages.percentage,
        stageMacroGroup: projectStages.macroGroup,
      })
      .from(projectTasks)
      .innerJoin(projectStages, eq(projectTasks.stageId, projectStages.id))
      .where(whereClause)
      .orderBy(asc(projectTasks.createdAt))
      .limit(paginationParams.perPage)
      .offset(offset);

    if (rows.length === 0) {
      return reply.send({
        data: [],
        pagination: paginationMeta(Number(total), paginationParams),
      });
    }

    const taskIds = rows.map((r) => r.id);

    const subtaskCounts = await db
      .select({
        taskId: projectSubtasks.taskId,
        total: count(),
      })
      .from(projectSubtasks)
      .where(and(inArray(projectSubtasks.taskId, taskIds), notArchived(projectSubtasks)))
      .groupBy(projectSubtasks.taskId);

    const countMap = new Map(subtaskCounts.map((s) => [s.taskId, Number(s.total)]));

    const data = rows.map((r) => ({
      ...r,
      subtaskCount: countMap.get(r.id) ?? 0,
    }));

    return reply.send({
      data,
      pagination: paginationMeta(Number(total), paginationParams),
    });
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function listAll(
  request: FastifyRequest<{ Querystring: Record<string, unknown> }>,
  reply: FastifyReply
) {
  try {
    const paginationParams = parsePagination(request.query);
    const { macroGroup } = request.query as Record<string, string | undefined>;

    const filterConds = buildFilters(request.query, [
      { field: projectTasks.projectId, type: "eq", param: "projectId" },
      { field: projectTasks.responsibleId, type: "eq", param: "responsibleId" },
      { field: projectTasks.priority, type: "eq", param: "priority" },
    ]);

    const parts: SQL[] = [notArchived(projectTasks), ...filterConds];

    if (macroGroup) {
      const stageIds = await db
        .select({ id: projectStages.id })
        .from(projectStages)
        .where(eq(projectStages.macroGroup, macroGroup as any));
      const ids = stageIds.map((s) => s.id);
      if (ids.length === 0) {
        return reply.send({
          data: [],
          pagination: paginationMeta(0, paginationParams),
        });
      }
      parts.push(inArray(projectTasks.stageId, ids));
    }

    const whereClause = parts.length === 1 ? parts[0]! : and(...parts)!;

    const [{ total }] = await db
      .select({ total: count() })
      .from(projectTasks)
      .where(whereClause);

    const rows = await db
      .select({
        id: projectTasks.id,
        title: projectTasks.title,
        description: projectTasks.description,
        projectId: projectTasks.projectId,
        responsibleId: projectTasks.responsibleId,
        stageId: projectTasks.stageId,
        priority: projectTasks.priority,
        plannedStartDate: projectTasks.plannedStartDate,
        plannedEndDate: projectTasks.plannedEndDate,
        actualStartDate: projectTasks.actualStartDate,
        actualEndDate: projectTasks.actualEndDate,
        dependsOnTaskId: projectTasks.dependsOnTaskId,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
        archived: projectTasks.archived,
        projectTitle: projects.title,
        stageName: projectStages.name,
        stagePercentage: projectStages.percentage,
        stageMacroGroup: projectStages.macroGroup,
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .innerJoin(projectStages, eq(projectTasks.stageId, projectStages.id))
      .where(whereClause)
      .limit(paginationParams.perPage)
      .offset(paginationOffset(paginationParams))
      .orderBy(asc(projectTasks.createdAt));

    return reply.send({
      data: rows,
      pagination: paginationMeta(Number(total), paginationParams),
    });
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function myTasks(
  request: FastifyRequest<{ Querystring: Record<string, unknown> }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };

    const tasks = await db
    .select({
      id: projectTasks.id,
      title: projectTasks.title,
      description: projectTasks.description,
      projectId: projectTasks.projectId,
      responsibleId: projectTasks.responsibleId,
      stageId: projectTasks.stageId,
      priority: projectTasks.priority,
      plannedStartDate: projectTasks.plannedStartDate,
      plannedEndDate: projectTasks.plannedEndDate,
      createdAt: projectTasks.createdAt,
      updatedAt: projectTasks.updatedAt,
      projectTitle: projects.title,
      stageName: projectStages.name,
      stagePercentage: projectStages.percentage,
      stageMacroGroup: projectStages.macroGroup,
      type: sql<string>`'task'`,
    })
    .from(projectTasks)
    .innerJoin(projects, eq(projectTasks.projectId, projects.id))
    .innerJoin(projectStages, eq(projectTasks.stageId, projectStages.id))
    .where(
      and(eq(projectTasks.responsibleId, user.id), notArchived(projectTasks))
    );

  const subtasks = await db
    .select({
      id: projectSubtasks.id,
      title: projectSubtasks.title,
      taskId: projectSubtasks.taskId,
      responsibleId: projectSubtasks.responsibleId,
      stageId: projectSubtasks.stageId,
      createdAt: projectSubtasks.createdAt,
      updatedAt: projectSubtasks.updatedAt,
      parentTaskTitle: projectTasks.title,
      projectId: projectTasks.projectId,
      projectTitle: projects.title,
      stageName: projectStages.name,
      stagePercentage: projectStages.percentage,
      stageMacroGroup: projectStages.macroGroup,
      type: sql<string>`'subtask'`,
    })
    .from(projectSubtasks)
    .innerJoin(projectTasks, eq(projectSubtasks.taskId, projectTasks.id))
    .innerJoin(projects, eq(projectTasks.projectId, projects.id))
    .innerJoin(projectStages, eq(projectSubtasks.stageId, projectStages.id))
    .where(
      and(
        eq(projectSubtasks.responsibleId, user.id),
        notArchived(projectSubtasks)
      )
    );

  const grouped = new Map<string, { projectId: string; projectTitle: string; tasks: any[]; subtasks: any[] }>();

  for (const t of tasks) {
    if (!grouped.has(t.projectId)) {
      grouped.set(t.projectId, {
        projectId: t.projectId,
        projectTitle: t.projectTitle,
        tasks: [],
        subtasks: [],
      });
    }
    grouped.get(t.projectId)!.tasks.push(t);
  }

  for (const s of subtasks) {
    if (!grouped.has(s.projectId)) {
      grouped.set(s.projectId, {
        projectId: s.projectId,
        projectTitle: s.projectTitle,
        tasks: [],
        subtasks: [],
      });
    }
    grouped.get(s.projectId)!.subtasks.push(s);
  }

    return reply.send(Array.from(grouped.values()));
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function getById(
  request: FastifyRequest<{ Params: { projectId: string; taskId: string } }>,
  reply: FastifyReply
) {
  try {
    const { projectId, taskId } = request.params;

    const [task] = await db
    .select({
      id: projectTasks.id,
      title: projectTasks.title,
      description: projectTasks.description,
      projectId: projectTasks.projectId,
      responsibleId: projectTasks.responsibleId,
      stageId: projectTasks.stageId,
      priority: projectTasks.priority,
      plannedStartDate: projectTasks.plannedStartDate,
      plannedEndDate: projectTasks.plannedEndDate,
      actualStartDate: projectTasks.actualStartDate,
      actualEndDate: projectTasks.actualEndDate,
      dependsOnTaskId: projectTasks.dependsOnTaskId,
      createdAt: projectTasks.createdAt,
      updatedAt: projectTasks.updatedAt,
      archived: projectTasks.archived,
      projectTitle: projects.title,
      stageName: projectStages.name,
      stagePercentage: projectStages.percentage,
      stageMacroGroup: projectStages.macroGroup,
    })
    .from(projectTasks)
    .innerJoin(projects, eq(projectTasks.projectId, projects.id))
    .innerJoin(projectStages, eq(projectTasks.stageId, projectStages.id))
    .where(
      and(
        eq(projectTasks.id, taskId),
        eq(projectTasks.projectId, projectId),
        notArchived(projectTasks)
      )
    )
    .limit(1);

  if (!task) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Tarefa não encontrada" });
  }

  const subtasks = await db
    .select({
      id: projectSubtasks.id,
      title: projectSubtasks.title,
      taskId: projectSubtasks.taskId,
      responsibleId: projectSubtasks.responsibleId,
      stageId: projectSubtasks.stageId,
      createdAt: projectSubtasks.createdAt,
      updatedAt: projectSubtasks.updatedAt,
      archived: projectSubtasks.archived,
      stageName: projectStages.name,
      stagePercentage: projectStages.percentage,
      stageMacroGroup: projectStages.macroGroup,
    })
    .from(projectSubtasks)
    .innerJoin(projectStages, eq(projectSubtasks.stageId, projectStages.id))
    .where(
      and(eq(projectSubtasks.taskId, taskId), notArchived(projectSubtasks))
    );

    return reply.send({ ...task, subtasks });
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function createTask(
  request: FastifyRequest<{ Params: { projectId: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { projectId } = request.params;

    const parsed = createTaskSchema.safeParse({
      ...(request.body as object),
      projectId,
    });
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), notArchived(projects)))
      .limit(1);

    if (!project) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Projeto não encontrado" });
    }

    const [inserted] = await db
      .insert(projectTasks)
      .values(parsed.data)
      .returning();

    await logAudit({
      userId: user.id,
      objectType: "project_task",
      recordId: inserted.id,
      action: "created",
    });

    return reply.status(201).send(inserted);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function updateTask(
  request: FastifyRequest<{ Params: { projectId: string; taskId: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { projectId, taskId } = request.params;

    const parsed = updateTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [existing] = await db
      .select()
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projectTasks.projectId, projectId),
          notArchived(projectTasks)
        )
      )
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Tarefa não encontrada" });
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) patch[key] = value;
    }

    if (Object.keys(patch).length === 0) return existing;

    const stageChanged =
      parsed.data.stageId !== undefined && parsed.data.stageId !== existing.stageId;

    const [updated] = await db
      .update(projectTasks)
      .set(patch as Partial<InferInsertModel<typeof projectTasks>>)
      .where(eq(projectTasks.id, taskId))
      .returning();

    if (stageChanged) {
      await logAudit({
        userId: user.id,
        objectType: "project_task",
        recordId: taskId,
        action: "stage_changed",
        field: "stageId",
        oldValue: existing.stageId,
        newValue: parsed.data.stageId!,
      });
    }

    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      if (key === "stageId" && stageChanged) continue;
      oldData[key] = (existing as Record<string, unknown>)[key];
      newData[key] = patch[key];
    }

    if (Object.keys(newData).length > 0) {
      await logChanges({
        userId: user.id,
        objectType: "project_task",
        recordId: taskId,
        oldData,
        newData,
      });
    }

    return updated;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function archiveTask(
  request: FastifyRequest<{ Params: { projectId: string; taskId: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { projectId, taskId } = request.params;

    const [existing] = await db
      .select({ id: projectTasks.id })
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projectTasks.projectId, projectId),
          notArchived(projectTasks)
        )
      )
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Tarefa não encontrada" });
    }

    await archiveRecord(projectTasks, taskId, user.id, "project_task");
    return reply.status(204).send();
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function restoreTask(
  request: FastifyRequest<{ Params: { projectId: string; taskId: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { projectId, taskId } = request.params;

    const [existing] = await db
      .select({ id: projectTasks.id })
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projectTasks.projectId, projectId),
          eq(projectTasks.archived, true)
        )
      )
      .limit(1);

    if (!existing) {
      return reply
        .status(404)
        .send({ error: "NOT_FOUND", message: "Tarefa não encontrada ou não arquivada" });
    }

    await restoreRecord(projectTasks, taskId, user.id, "project_task");

    const [row] = await db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.id, taskId))
      .limit(1);

    return row;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function listSubtasks(
  request: FastifyRequest<{ Params: { projectId: string; taskId: string } }>,
  reply: FastifyReply
) {
  try {
    const { taskId } = request.params;

    const rows = await db
      .select({
        id: projectSubtasks.id,
        title: projectSubtasks.title,
        taskId: projectSubtasks.taskId,
        responsibleId: projectSubtasks.responsibleId,
        stageId: projectSubtasks.stageId,
        createdAt: projectSubtasks.createdAt,
        updatedAt: projectSubtasks.updatedAt,
        archived: projectSubtasks.archived,
        stageName: projectStages.name,
        stagePercentage: projectStages.percentage,
        stageMacroGroup: projectStages.macroGroup,
      })
      .from(projectSubtasks)
      .innerJoin(projectStages, eq(projectSubtasks.stageId, projectStages.id))
      .where(and(eq(projectSubtasks.taskId, taskId), notArchived(projectSubtasks)))
      .orderBy(asc(projectSubtasks.createdAt));

    return reply.send(rows);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function createSubtask(
  request: FastifyRequest<{ Params: { projectId: string; taskId: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { taskId } = request.params;

    const parsed = createSubtaskSchema.safeParse({
      ...(request.body as object),
      taskId,
    });
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [task] = await db
      .select({ id: projectTasks.id })
      .from(projectTasks)
      .where(and(eq(projectTasks.id, taskId), notArchived(projectTasks)))
      .limit(1);

    if (!task) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Tarefa não encontrada" });
    }

    const [inserted] = await db
      .insert(projectSubtasks)
      .values(parsed.data)
      .returning();

    await logAudit({
      userId: user.id,
      objectType: "project_subtask",
      recordId: inserted.id,
      action: "created",
    });

    return reply.status(201).send(inserted);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function updateSubtask(
  request: FastifyRequest<{
    Params: { projectId: string; taskId: string; subtaskId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { subtaskId } = request.params;

  const parsed = updateSubtaskSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const [existing] = await db
    .select()
    .from(projectSubtasks)
    .where(and(eq(projectSubtasks.id, subtaskId), notArchived(projectSubtasks)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Subtarefa não encontrada" });
  }

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) patch[key] = value;
  }

  if (Object.keys(patch).length === 0) return existing;

  const stageChanged =
    parsed.data.stageId !== undefined && parsed.data.stageId !== existing.stageId;

  const [updated] = await db
    .update(projectSubtasks)
    .set(patch as Partial<InferInsertModel<typeof projectSubtasks>>)
    .where(eq(projectSubtasks.id, subtaskId))
    .returning();

  if (stageChanged) {
    await logAudit({
      userId: user.id,
      objectType: "project_subtask",
      recordId: subtaskId,
      action: "stage_changed",
      field: "stageId",
      oldValue: existing.stageId,
      newValue: parsed.data.stageId!,
    });
  }

  const oldData: Record<string, unknown> = {};
  const newData: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    if (key === "stageId" && stageChanged) continue;
    oldData[key] = (existing as Record<string, unknown>)[key];
    newData[key] = patch[key];
  }

  if (Object.keys(newData).length > 0) {
    await logChanges({
      userId: user.id,
      objectType: "project_subtask",
      recordId: subtaskId,
      oldData,
      newData,
    });
  }

    return updated;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function deleteSubtask(
  request: FastifyRequest<{
    Params: { projectId: string; taskId: string; subtaskId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { subtaskId } = request.params;

    const [existing] = await db
      .select({ id: projectSubtasks.id })
      .from(projectSubtasks)
      .where(eq(projectSubtasks.id, subtaskId))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Subtarefa não encontrada" });
    }

    await db.delete(projectSubtasks).where(eq(projectSubtasks.id, subtaskId));
    return reply.status(204).send();
  } catch (err) {
    return handleError(reply, err);
  }
}
