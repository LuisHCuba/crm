import { FastifyRequest, FastifyReply } from "fastify";
import { and, count, desc, eq, ne, type SQL } from "drizzle-orm";
import { db } from "../../db/connection";
import { products } from "../../db/schema";
import { parsePagination, paginationMeta, paginationOffset } from "../../lib/pagination";
import { searchFilter } from "../../lib/filters";
import { logAudit, logChanges } from "../../lib/audit";
import { handleError } from "../../lib/errors";
import { archiveRecord, restoreRecord, notArchived } from "../../lib/soft-delete";
import {
  produtoCreateSchema,
  produtoUpdateSchema,
  listProdutosQuerySchema,
  produtoIdParamsSchema,
} from "./produto.schemas";

const OBJECT_TYPE = "product";

function mapRow(row: typeof products.$inferSelect) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archived: row.archived,
    name: row.name,
    sku: row.sku,
    description: row.description,
    basePrice: row.basePrice,
    unit: row.unit,
    active: row.active,
  };
}

export async function list(request: FastifyRequest, reply: FastifyReply) {
  try {
    const q = listProdutosQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send({ error: "Validation", issues: q.error.issues });
    }

    const pagination = parsePagination({
      page: q.data.page,
      perPage: q.data.perPage,
    });

    const conditions: SQL[] = [];
    if ((request.query as any).includeArchived !== "true") conditions.push(notArchived(products));

    if (q.data.active === "true") {
      conditions.push(eq(products.active, true));
    } else if (q.data.active === "false") {
      conditions.push(eq(products.active, false));
    }

    const searchCond = searchFilter(
      [products.name, products.sku],
      q.data.search ?? ""
    );
    if (searchCond) {
      conditions.push(searchCond);
    }

    const whereClause = and(...conditions);

    const offset = paginationOffset(pagination);

    const [totalRow] = await db
      .select({ total: count() })
      .from(products)
      .where(whereClause);

    const total = Number(totalRow?.total ?? 0);

    const rows = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(pagination.perPage)
      .offset(offset);

    return {
      data: rows.map(mapRow),
      pagination: paginationMeta(total, pagination),
    };
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  try {
    const params = produtoIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Validation", issues: params.error.issues });
    }

    const row = await db.query.products.findFirst({
      where: eq(products.id, params.data.id),
    });

    if (!row) {
      return reply.status(404).send({ error: "NotFound", message: "Produto não encontrado" });
    }

    return mapRow(row);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: userId } = request.user as { id: string };

    const parsed = produtoCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const { sku, ...rest } = parsed.data;

    if (sku) {
      const taken = await db.query.products.findFirst({
        where: eq(products.sku, sku),
      });
      if (taken) {
        return reply.status(409).send({ error: "Conflict", message: "SKU já cadastrado" });
      }
    }

    const [inserted] = await db
      .insert(products)
      .values({
        ...rest,
        sku: sku ?? null,
      })
      .returning();

    await logAudit({
      userId,
      objectType: OBJECT_TYPE,
      recordId: inserted.id,
      action: "created",
    });

    return reply.status(201).send(mapRow(inserted));
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: userId } = request.user as { id: string };

    const params = produtoIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Validation", issues: params.error.issues });
    }

    const parsed = produtoUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const payload = parsed.data;
    if (Object.keys(payload).length === 0) {
      return reply.status(400).send({ error: "Validation", message: "Nenhum campo para atualizar" });
    }

    const existing = await db.query.products.findFirst({
      where: eq(products.id, params.data.id),
    });
    if (!existing) {
      return reply.status(404).send({ error: "NotFound", message: "Produto não encontrado" });
    }

    if (payload.sku !== undefined && payload.sku !== null) {
      const taken = await db.query.products.findFirst({
        where: and(eq(products.sku, payload.sku), ne(products.id, params.data.id)),
      });
      if (taken) {
        return reply.status(409).send({ error: "Conflict", message: "SKU já cadastrado" });
      }
    }

    const [updated] = await db
      .update(products)
      .set(payload)
      .where(eq(products.id, params.data.id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: "NotFound", message: "Produto não encontrado" });
    }

    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};
    for (const key of Object.keys(payload)) {
      const k = key as keyof typeof existing;
      oldData[key] = existing[k];
      newData[key] = updated[k];
    }

    await logChanges({
      userId,
      objectType: OBJECT_TYPE,
      recordId: params.data.id,
      oldData,
      newData,
    });

    return mapRow(updated);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function archive(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: userId } = request.user as { id: string };

    const params = produtoIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Validation", issues: params.error.issues });
    }

    const existing = await db.query.products.findFirst({
      where: eq(products.id, params.data.id),
    });
    if (!existing) {
      return reply.status(404).send({ error: "NotFound", message: "Produto não encontrado" });
    }

    await archiveRecord(products, params.data.id, userId, OBJECT_TYPE);

    return reply.status(204).send();
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function restore(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: userId } = request.user as { id: string };

    const params = produtoIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Validation", issues: params.error.issues });
    }

    const existing = await db.query.products.findFirst({
      where: eq(products.id, params.data.id),
    });
    if (!existing) {
      return reply.status(404).send({ error: "NotFound", message: "Produto não encontrado" });
    }

    await restoreRecord(products, params.data.id, userId, OBJECT_TYPE);

    const row = await db.query.products.findFirst({
      where: eq(products.id, params.data.id),
    });

    return mapRow(row!);
  } catch (err) {
    return handleError(reply, err);
  }
}
