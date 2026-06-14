import { FastifyRequest, FastifyReply } from "fastify";
import { and, count, eq, gte, lte, isNull, isNotNull, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "../../db/connection";
import { activities } from "../../db/schema";
import { logAudit } from "../../lib/audit";
import { handleError } from "../../lib/errors";
import {
  parsePagination,
  paginationOffset,
  paginationMeta,
} from "../../lib/pagination";
import { createActivitySchema } from "./atividade.schemas";

export async function create(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };

    const parsed = createActivitySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Validation", issues: parsed.error.issues });
    }

    const data = parsed.data;

    const values: Record<string, unknown> = {
      type: data.type,
      createdById: user.id,
      title: data.title ?? null,
      body: data.body ?? null,
      linkedCompanyId: data.linkedCompanyId ?? null,
      linkedContactId: data.linkedContactId ?? null,
      linkedDealId: data.linkedDealId ?? null,
      linkedProjectId: data.linkedProjectId ?? null,
      linkedTaskId: data.linkedTaskId ?? null,
    };

    if (data.type === "reminder") {
      values.reminderDueDate = new Date(data.reminderDueDate);
      values.reminderResponsibleId = data.reminderResponsibleId ?? user.id;
    }
    if (data.type === "call") {
      values.callDurationMinutes = data.callDurationMinutes ?? null;
      values.callResult = data.callResult ?? null;
    }
    if (data.type === "meeting") {
      values.meetingDate = data.meetingDate ? new Date(data.meetingDate) : null;
      values.meetingParticipants = data.meetingParticipants ?? null;
    }
    if (data.type === "email") {
      values.emailSubject = data.emailSubject ?? null;
    }

    const [inserted] = await db
      .insert(activities)
      .values(values as typeof activities.$inferInsert)
      .returning();

    await logAudit({
      userId: user.id,
      objectType: "activity",
      recordId: inserted.id,
      action: "created",
    });

    return reply.status(201).send(inserted);
  } catch (err) {
    return handleError(reply, err);
  }
}

const linkedFieldMap: Record<string, AnyPgColumn> = {
  linkedCompanyId: activities.linkedCompanyId,
  linkedContactId: activities.linkedContactId,
  linkedDealId: activities.linkedDealId,
  linkedProjectId: activities.linkedProjectId,
  linkedTaskId: activities.linkedTaskId,
};

export async function listByRecord(
  request: FastifyRequest<{ Querystring: Record<string, unknown> }>,
  reply: FastifyReply
) {
  try {
    const paginationParams = parsePagination(request.query);
    const conditions: SQL[] = [];

    for (const [param, column] of Object.entries(linkedFieldMap)) {
      const value = request.query[param];
      if (value && typeof value === "string") {
        conditions.push(eq(column, value));
      }
    }

    if (conditions.length === 0) {
      return reply
        .status(400)
        .send({ error: "Validation", message: "Informe ao menos um filtro de vínculo" });
    }

    const whereClause = conditions.length === 1 ? conditions[0]! : and(...conditions)!;

    const [{ total }] = await db
      .select({ total: count() })
      .from(activities)
      .where(whereClause);

    const rows = await db
      .select()
      .from(activities)
      .where(whereClause)
      .orderBy(activities.createdAt)
      .limit(paginationParams.perPage)
      .offset(paginationOffset(paginationParams));

    return reply.send({
      data: rows,
      pagination: paginationMeta(Number(total), paginationParams),
    });
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function listReminders(
  request: FastifyRequest<{ Querystring: Record<string, unknown> }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const paginationParams = parsePagination(request.query);
    const query = request.query;

    const conditions: SQL[] = [
      eq(activities.type, "reminder"),
      eq(activities.reminderResponsibleId, user.id),
    ];

    if (query.status === "pending") {
      conditions.push(isNull(activities.reminderCompleted));
    } else if (query.status === "completed") {
      conditions.push(isNotNull(activities.reminderCompleted));
    }

    if (query.dueDateFrom && typeof query.dueDateFrom === "string") {
      conditions.push(gte(activities.reminderDueDate, new Date(query.dueDateFrom)));
    }
    if (query.dueDateTo && typeof query.dueDateTo === "string") {
      conditions.push(lte(activities.reminderDueDate, new Date(query.dueDateTo)));
    }

    const whereClause = and(...conditions)!;

    const [{ total }] = await db
      .select({ total: count() })
      .from(activities)
      .where(whereClause);

    const rows = await db
      .select()
      .from(activities)
      .where(whereClause)
      .orderBy(activities.reminderDueDate)
      .limit(paginationParams.perPage)
      .offset(paginationOffset(paginationParams));

    return reply.send({
      data: rows,
      pagination: paginationMeta(Number(total), paginationParams),
    });
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function completeReminder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { id } = request.params;

    const [existing] = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.id, id),
          eq(activities.type, "reminder"),
          isNull(activities.reminderCompleted)
        )
      )
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Lembrete não encontrado ou já concluído",
      });
    }

    if (existing.reminderResponsibleId && existing.reminderResponsibleId !== user.id) {
      return reply.status(403).send({
        error: "FORBIDDEN",
        message: "Apenas o responsável pode concluir este lembrete",
      });
    }

    const [updated] = await db
      .update(activities)
      .set({ reminderCompleted: new Date() })
      .where(eq(activities.id, id))
      .returning();

    await logAudit({
      userId: user.id,
      objectType: "activity",
      recordId: id,
      action: "updated",
      field: "reminderCompleted",
    });

    return reply.send(updated);
  } catch (err) {
    return handleError(reply, err);
  }
}
