import { FastifyRequest, FastifyReply } from "fastify";
import { and, eq, type InferInsertModel } from "drizzle-orm";
import { db } from "../../db/connection";
import { financialCategories } from "../../db/schema";
import { logAudit, logChanges } from "../../lib/audit";
import { notArchived, archiveRecord, restoreRecord } from "../../lib/soft-delete";
import {
  createCategoriaFinanceiraSchema,
  updateCategoriaFinanceiraSchema,
} from "./categoria-financeira.schemas";

export async function list(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const rows = await db
    .select()
    .from(financialCategories)
    .where(notArchived(financialCategories));

  return reply.send({ data: rows });
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  const [row] = await db
    .select()
    .from(financialCategories)
    .where(and(eq(financialCategories.id, id), notArchived(financialCategories)))
    .limit(1);

  if (!row) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado" });
  }

  return row;
}

export async function create(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string };
  const parsed = createCategoriaFinanceiraSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const [inserted] = await db
    .insert(financialCategories)
    .values(parsed.data)
    .returning();

  await logAudit({
    userId: user.id,
    objectType: "financial_category",
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

  const parsed = updateCategoriaFinanceiraSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const [existing] = await db
    .select()
    .from(financialCategories)
    .where(and(eq(financialCategories.id, id), notArchived(financialCategories)))
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
    .update(financialCategories)
    .set(patch as Partial<InferInsertModel<typeof financialCategories>>)
    .where(eq(financialCategories.id, id))
    .returning();

  const oldData: Record<string, unknown> = {};
  const newData: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    oldData[key] = (existing as Record<string, unknown>)[key];
    newData[key] = patch[key];
  }

  await logChanges({
    userId: user.id,
    objectType: "financial_category",
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
    .select({ id: financialCategories.id })
    .from(financialCategories)
    .where(and(eq(financialCategories.id, id), notArchived(financialCategories)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado" });
  }

  await archiveRecord(financialCategories, id, user.id, "financial_category");
  return reply.status(204).send();
}

export async function restore(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string };
  const { id } = request.params;

  const [existing] = await db
    .select({ id: financialCategories.id })
    .from(financialCategories)
    .where(and(eq(financialCategories.id, id), eq(financialCategories.archived, true)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado ou não arquivado" });
  }

  await restoreRecord(financialCategories, id, user.id, "financial_category");

  const [row] = await db
    .select()
    .from(financialCategories)
    .where(and(eq(financialCategories.id, id), notArchived(financialCategories)))
    .limit(1);

  return row;
}
