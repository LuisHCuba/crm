import { FastifyRequest, FastifyReply } from "fastify";
import {
  and,
  count,
  eq,
  ne,
  sql,
  type InferInsertModel,
  type SQL,
} from "drizzle-orm";
import { db } from "../../db/connection";
import { companies } from "../../db/schema";
import { logAudit, logChanges } from "../../lib/audit";
import { handleError } from "../../lib/errors";
import { buildFilters, searchFilter } from "../../lib/filters";
import {
  parsePagination,
  paginationOffset,
  paginationMeta,
} from "../../lib/pagination";
import { archiveRecord, notArchived, restoreRecord } from "../../lib/soft-delete";
import {
  createEmpresaSchema,
  updateEmpresaSchema,
} from "./empresa.schemas";

function listWhereClause(query: Record<string, unknown>): SQL {
  const filterConds = buildFilters(query, [
    { field: companies.type, type: "eq", param: "type" },
    { field: companies.responsibleId, type: "eq", param: "responsibleId" },
  ]);
  const search = searchFilter(
    [companies.legalName, companies.tradeName, companies.document],
    String(query.search ?? "")
  );
  const parts: SQL[] = [...filterConds];
  if (query.includeArchived !== "true") parts.unshift(notArchived(companies));
  if (search) parts.push(search);
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
      .from(companies)
      .where(whereClause);

    const rows = await db
      .select()
      .from(companies)
      .where(whereClause)
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

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const [row] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), notArchived(companies)))
      .limit(1);

    if (!row) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Registro não encontrado",
      });
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

    const parsed = createEmpresaSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Validation", issues: parsed.error.issues });
    }

    const [dup] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.document, parsed.data.document))
      .limit(1);

    if (dup) {
      return reply.status(409).send({
        error: "CONFLICT",
        message: "Documento já cadastrado",
      });
    }

    const [inserted] = await db
      .insert(companies)
      .values(parsed.data)
      .returning();

    await logAudit({
      userId: user.id,
      objectType: "company",
      recordId: inserted.id,
      action: "created",
    });

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

    const parsed = updateEmpresaSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Validation", issues: parsed.error.issues });
    }

    const [existing] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), notArchived(companies)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Registro não encontrado",
      });
    }

    if (
      parsed.data.document !== undefined &&
      parsed.data.document !== existing.document
    ) {
      const [other] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(
          and(
            eq(companies.document, parsed.data.document),
            ne(companies.id, id)
          )
        )
        .limit(1);

      if (other) {
        return reply.status(409).send({
          error: "CONFLICT",
          message: "Documento já cadastrado",
        });
      }
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    if (Object.keys(patch).length === 0) {
      return existing;
    }

    const [updated] = await db
      .update(companies)
      .set(patch as Partial<InferInsertModel<typeof companies>>)
      .where(eq(companies.id, id))
      .returning();

    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      oldData[key] = (existing as Record<string, unknown>)[key];
      newData[key] = patch[key];
    }

    await logChanges({
      userId: user.id,
      objectType: "company",
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
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, id), notArchived(companies)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Registro não encontrado",
      });
    }

    await archiveRecord(companies, id, user.id, "company");
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
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.archived, true)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Registro não encontrado ou não arquivado",
      });
    }

    await restoreRecord(companies, id, user.id, "company");

    const [row] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), notArchived(companies)))
      .limit(1);

    return row;
  } catch (err) {
    return handleError(reply, err);
  }
}
