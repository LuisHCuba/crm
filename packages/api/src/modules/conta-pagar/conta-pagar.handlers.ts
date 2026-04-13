import { FastifyRequest, FastifyReply } from "fastify";
import { and, eq, count, sql, type InferInsertModel } from "drizzle-orm";
import { db } from "../../db/connection";
import { payables } from "../../db/schema";
import { logAudit, logChanges } from "../../lib/audit";
import { handleError } from "../../lib/errors";
import { buildFilters } from "../../lib/filters";
import { parsePagination, paginationOffset, paginationMeta } from "../../lib/pagination";
import { notArchived, archiveRecord, restoreRecord } from "../../lib/soft-delete";
import {
  createContaPagarSchema,
  updateContaPagarSchema,
  payContaPagarSchema,
} from "./conta-pagar.schemas";

const RECURRENCE_MONTHS: Record<string, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function listWhereClause(query: Record<string, unknown>) {
  const filterConds = buildFilters(query, [
    { field: payables.status, type: "eq", param: "status" },
    { field: payables.companyId, type: "eq", param: "companyId" },
    { field: payables.categoryId, type: "eq", param: "categoryId" },
    { field: payables.dueDate, type: "gte", param: "dueDateFrom" },
    { field: payables.dueDate, type: "lte", param: "dueDateTo" },
  ]);
  const parts = [...filterConds];
  if (query.includeArchived !== "true") parts.unshift(notArchived(payables));
  if (parts.length === 0) return sql`true`;
  return parts.length === 1 ? parts[0]! : and(...parts)!;
}

export async function list(
  request: FastifyRequest<{ Querystring: Record<string, unknown> }>,
  reply: FastifyReply
) {
  try {
    const paginationParams = parsePagination(request.query);
    const whereClause = listWhereClause(request.query);

    const [{ total }] = await db
      .select({ total: count() })
      .from(payables)
      .where(whereClause);

    const rows = await db
      .select()
      .from(payables)
      .where(whereClause)
      .orderBy(payables.dueDate)
      .limit(paginationParams.perPage)
      .offset(paginationOffset(paginationParams));

    const [totals] = await db
      .select({
        totalPending: sql<string>`COALESCE(SUM(CASE WHEN status = 'pending' THEN value ELSE 0 END), 0)`,
        totalOverdue: sql<string>`COALESCE(SUM(CASE WHEN status = 'overdue' THEN value ELSE 0 END), 0)`,
        totalPaid: sql<string>`COALESCE(SUM(CASE WHEN status = 'paid' THEN paid_value ELSE 0 END), 0)`,
      })
      .from(payables)
      .where(request.query.includeArchived === "true" ? undefined : notArchived(payables));

    return reply.send({
      data: rows,
      totals: {
        totalPending: totals.totalPending,
        totalOverdue: totals.totalOverdue,
        totalPaid: totals.totalPaid,
      },
      pagination: paginationMeta(Number(total), paginationParams),
    });
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const [row] = await db
      .select()
      .from(payables)
      .where(and(eq(payables.id, id), notArchived(payables)))
      .limit(1);

    if (!row) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado" });
    }

    return row;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function create(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const parsed = createContaPagarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const { recurrence, recurrenceCount, ...baseData } = parsed.data;

    if (recurrence === "none" || !recurrenceCount) {
      const [inserted] = await db.insert(payables).values(baseData).returning();
      await logAudit({
        userId: user.id,
        objectType: "payable",
        recordId: inserted.id,
        action: "created",
      });
      return reply.status(201).send(inserted);
    }

    const months = RECURRENCE_MONTHS[recurrence];
    const parcelGroup = crypto.randomUUID();
    const records: typeof baseData[] = [];

    for (let i = 0; i < recurrenceCount; i++) {
      records.push({
        ...baseData,
        dueDate: i === 0 ? baseData.dueDate : addMonths(baseData.dueDate, months * i),
      });
    }

    const valuesToInsert = records.map((r, i) => ({
      ...r,
      parcelGroup,
      parcelLabel: `${i + 1}/${recurrenceCount}`,
    }));

    const inserted = await db.insert(payables).values(valuesToInsert).returning();

    for (const rec of inserted) {
      await logAudit({
        userId: user.id,
        objectType: "payable",
        recordId: rec.id,
        action: "created",
      });
    }

    return reply.status(201).send(inserted);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function update(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { id } = request.params;

    const parsed = updateContaPagarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [existing] = await db
      .select()
      .from(payables)
      .where(and(eq(payables.id, id), notArchived(payables)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado" });
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) patch[key] = value;
    }

    if (Object.keys(patch).length === 0) return existing;

    const [updated] = await db
      .update(payables)
      .set(patch as Partial<InferInsertModel<typeof payables>>)
      .where(eq(payables.id, id))
      .returning();

    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      oldData[key] = (existing as Record<string, unknown>)[key];
      newData[key] = patch[key];
    }

    await logChanges({
      userId: user.id,
      objectType: "payable",
      recordId: id,
      oldData,
      newData,
    });

    return updated;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function archive(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { id } = request.params;

    const [existing] = await db
      .select({ id: payables.id })
      .from(payables)
      .where(and(eq(payables.id, id), notArchived(payables)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado" });
    }

    await archiveRecord(payables, id, user.id, "payable");
    return reply.status(204).send();
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function restore(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { id } = request.params;

    const [existing] = await db
      .select({ id: payables.id })
      .from(payables)
      .where(and(eq(payables.id, id), eq(payables.archived, true)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado ou não arquivado" });
    }

    await restoreRecord(payables, id, user.id, "payable");

    const [row] = await db
      .select()
      .from(payables)
      .where(and(eq(payables.id, id), notArchived(payables)))
      .limit(1);

    return row;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function pay(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { id } = request.params;

    const parsed = payContaPagarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [existing] = await db
      .select()
      .from(payables)
      .where(and(eq(payables.id, id), notArchived(payables)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado" });
    }

    if (existing.status === "paid") {
      return reply.status(400).send({ error: "VALIDATION_ERROR", message: "Conta já paga" });
    }

    if (existing.status === "cancelled") {
      return reply.status(400).send({ error: "VALIDATION_ERROR", message: "Conta cancelada" });
    }

    const [updated] = await db
      .update(payables)
      .set({
        status: "paid",
        paymentDate: parsed.data.paymentDate,
        paidValue: parsed.data.paidValue,
        bankAccountId: parsed.data.bankAccountId,
      } as Partial<InferInsertModel<typeof payables>>)
      .where(eq(payables.id, id))
      .returning();

    await logAudit({
      userId: user.id,
      objectType: "payable",
      recordId: id,
      action: "updated",
      field: "status",
      oldValue: existing.status,
      newValue: "paid",
    });

    return updated;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function cancel(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const user = request.user as { id: string; email: string };
    const { id } = request.params;

    const [existing] = await db
      .select()
      .from(payables)
      .where(and(eq(payables.id, id), notArchived(payables)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado" });
    }

    if (existing.status === "cancelled") {
      return reply.status(400).send({ error: "VALIDATION_ERROR", message: "Conta já cancelada" });
    }

    const [updated] = await db
      .update(payables)
      .set({ status: "cancelled" } as Partial<InferInsertModel<typeof payables>>)
      .where(eq(payables.id, id))
      .returning();

    await logAudit({
      userId: user.id,
      objectType: "payable",
      recordId: id,
      action: "updated",
      field: "status",
      oldValue: existing.status,
      newValue: "cancelled",
    });

    return updated;
  } catch (err) {
    return handleError(reply, err);
  }
}
