import { FastifyRequest, FastifyReply } from "fastify";
import { and, count, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "../../db/connection";
import { auditLog, users } from "../../db/schema";
import { handleError } from "../../lib/errors";
import { buildFilters } from "../../lib/filters";
import {
  parsePagination,
  paginationOffset,
  paginationMeta,
} from "../../lib/pagination";

function listWhereClause(query: Record<string, unknown>): SQL | undefined {
  const conditions = buildFilters(query, [
    { field: auditLog.userId, type: "eq", param: "userId" },
    { field: auditLog.recordId, type: "eq", param: "recordId" },
    { field: auditLog.objectType, type: "eq", param: "objectType" },
    { field: auditLog.action, type: "eq", param: "action" },
    { field: auditLog.createdAt, type: "gte", param: "dateFrom" },
    { field: auditLog.createdAt, type: "lte", param: "dateTo" },
  ]);

  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
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
      .from(auditLog)
      .where(whereClause);

    const rows = await db
      .select({
        id: auditLog.id,
        createdAt: auditLog.createdAt,
        userId: auditLog.userId,
        userName: users.name,
        objectType: auditLog.objectType,
        recordId: auditLog.recordId,
        action: auditLog.action,
        field: auditLog.field,
        oldValue: auditLog.oldValue,
        newValue: auditLog.newValue,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(whereClause)
      .orderBy(auditLog.createdAt)
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
