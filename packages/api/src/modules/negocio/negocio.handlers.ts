import { FastifyRequest, FastifyReply } from "fastify";
import {
  and,
  count,
  eq,
  inArray,
  sql,
  sum,
  type InferInsertModel,
  type SQL,
} from "drizzle-orm";
import { db } from "../../db/connection";
import {
  deals,
  dealContacts,
  dealLineItems,
  companies,
  contacts,
  pipelineStages,
  pipelines,
  receivables,
} from "../../db/schema";
import { logAudit, logChanges } from "../../lib/audit";
import { dispatchWebhook } from "../../lib/webhooks";
import { handleError } from "../../lib/errors";
import { buildFilters, searchFilter } from "../../lib/filters";
import {
  parsePagination,
  paginationOffset,
  paginationMeta,
} from "../../lib/pagination";
import { archiveRecord, notArchived, restoreRecord } from "../../lib/soft-delete";
import {
  createDealSchema,
  updateDealSchema,
  createLineItemSchema,
  updateLineItemSchema,
  linkContactSchema,
} from "./negocio.schemas";

/** Evita Zod "Expected string, received null" quando o cliente manda null em campos string. */
function normalizeCreateDealBody(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const b = raw as Record<string, unknown>;
  const str = (key: string) => {
    const v = b[key];
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    return "";
  };
  const out: Record<string, unknown> = {
    ...b,
    title: str("title"),
    pipelineId: str("pipelineId"),
    stageId: str("stageId"),
    responsibleId: str("responsibleId"),
  };
  /* createDealSchema: companyId só como UUID ou omitido — nunca null (Zod optional não aceita null). */
  if (
    out.companyId === null ||
    out.companyId === undefined ||
    out.companyId === ""
  ) {
    delete out.companyId;
  }
  return out;
}

function normalizeUpdateDealBody(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const b = raw as Record<string, unknown>;
  const out = { ...b };
  if (out.companyId === "") {
    out.companyId = null;
  }
  return out;
}

function listWhereClause(query: Record<string, unknown>): SQL {
  const filterConds = buildFilters(query, [
    { field: deals.pipelineId, type: "eq", param: "pipelineId" },
    { field: deals.stageId, type: "eq", param: "stageId" },
    { field: deals.companyId, type: "eq", param: "companyId" },
    { field: deals.responsibleId, type: "eq", param: "responsibleId" },
  ]);
  const search = searchFilter([deals.title], String(query.search ?? ""));
  const parts: SQL[] = [notArchived(deals), ...filterConds];
  if (search) parts.push(search);

  const contactId = query.contactId;
  if (contactId !== undefined && contactId !== null && String(contactId) !== "") {
    parts.push(
      inArray(
        deals.id,
        db
          .select({ dealId: dealContacts.dealId })
          .from(dealContacts)
          .where(eq(dealContacts.contactId, String(contactId)))
      )
    );
  }

  const productId = query.productId;
  if (productId !== undefined && productId !== null && String(productId) !== "") {
    parts.push(
      inArray(
        deals.id,
        db
          .select({ dealId: dealLineItems.dealId })
          .from(dealLineItems)
          .where(eq(dealLineItems.productId, String(productId)))
      )
    );
  }

  return parts.length === 1 ? parts[0]! : and(...parts)!;
}

async function recalcDealTotalValue(dealId: string) {
  const [result] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${dealLineItems.subtotal}), 0)`,
    })
    .from(dealLineItems)
    .where(eq(dealLineItems.dealId, dealId));

  await db
    .update(deals)
    .set({ totalValue: result.total })
    .where(eq(deals.id, dealId));
}

function calculateSubtotal(
  quantity: number,
  unitPrice: string,
  discountPercent: string
): string {
  const sub =
    quantity *
    parseFloat(unitPrice) *
    (1 - parseFloat(discountPercent) / 100);
  return sub.toFixed(2);
}

export async function list(
  request: FastifyRequest<{ Querystring: Record<string, unknown> }>,
  reply: FastifyReply
) {
  try {
    const query = request.query;

    if (query.groupByStage === "true" && query.pipelineId) {
      const stages = await db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.pipelineId, String(query.pipelineId)))
        .orderBy(pipelineStages.order);

      const conditions: SQL[] = [
        notArchived(deals),
        eq(deals.pipelineId, String(query.pipelineId)),
      ];

      if (query.companyId)
        conditions.push(eq(deals.companyId, String(query.companyId)));
      if (query.responsibleId)
        conditions.push(eq(deals.responsibleId, String(query.responsibleId)));

      const search = searchFilter([deals.title], String(query.search ?? ""));
      if (search) conditions.push(search);

      if (query.contactId) {
        conditions.push(
          inArray(
            deals.id,
            db
              .select({ dealId: dealContacts.dealId })
              .from(dealContacts)
              .where(eq(dealContacts.contactId, String(query.contactId)))
          )
        );
      }
      if (query.productId) {
        conditions.push(
          inArray(
            deals.id,
            db
              .select({ dealId: dealLineItems.dealId })
              .from(dealLineItems)
              .where(eq(dealLineItems.productId, String(query.productId)))
          )
        );
      }

      const allDeals = await db
        .select()
        .from(deals)
        .where(and(...conditions));

      const dealsByStage = new Map<string, typeof allDeals>();
      for (const deal of allDeals) {
        const arr = dealsByStage.get(deal.stageId) ?? [];
        arr.push(deal);
        dealsByStage.set(deal.stageId, arr);
      }

      const stagesWithDeals = stages.map((stage) => {
        const stageDeals = dealsByStage.get(stage.id) ?? [];
        const totalValue = stageDeals
          .reduce((sum, d) => sum + parseFloat(d.totalValue ?? "0"), 0)
          .toFixed(2);
        return {
          id: stage.id,
          name: stage.name,
          type: stage.type,
          order: stage.order,
          deals: stageDeals,
          totalValue,
          count: stageDeals.length,
        };
      });

      return reply.send({ stages: stagesWithDeals });
    }

    const paginationParams = parsePagination(query);
    const whereClause = listWhereClause(query);

    const [{ total }] = await db
      .select({ total: count() })
      .from(deals)
      .where(whereClause);

    const rows = await db
      .select()
      .from(deals)
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

    const [deal] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, id), notArchived(deals)))
      .limit(1);

    if (!deal) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Negócio não encontrado",
      });
    }

    let company: { id: string; legalName: string; tradeName: string | null } | null = null;
    if (deal.companyId) {
      const [row] = await db
        .select({
          id: companies.id,
          legalName: companies.legalName,
          tradeName: companies.tradeName,
        })
        .from(companies)
        .where(eq(companies.id, deal.companyId))
        .limit(1);
      company = row ?? null;
    }

    const [pipeline] = await db
      .select({ id: pipelines.id, name: pipelines.name })
      .from(pipelines)
      .where(eq(pipelines.id, deal.pipelineId))
      .limit(1);

    const [stage] = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, deal.stageId))
      .limit(1);

    const dealContactRows = await db
      .select({
        id: contacts.id,
        name: contacts.fullName,
        email: contacts.email,
        phone: contacts.phone,
      })
      .from(dealContacts)
      .innerJoin(contacts, eq(dealContacts.contactId, contacts.id))
      .where(eq(dealContacts.dealId, id));

    const lineItems = await db
      .select()
      .from(dealLineItems)
      .where(eq(dealLineItems.dealId, id));

    return reply.send({
      ...deal,
      company,
      pipeline: pipeline ?? null,
      stage,
      contacts: dealContactRows,
      lineItems,
    });
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

    const parsed = createDealSchema.safeParse(normalizeCreateDealBody(request.body));
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Validation", issues: parsed.error.issues });
    }

    const { contactIds: rawContactIds, companyId: rawCompanyId, ...restFields } = parsed.data;
    const dealFields = { ...restFields, companyId: rawCompanyId ?? null };
    const contactIds = [...new Set(rawContactIds ?? [])];

    if (contactIds.length > 0) {
      const found = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(inArray(contacts.id, contactIds));
      const foundSet = new Set(found.map((r) => r.id));
      const missing = contactIds.filter((id) => !foundSet.has(id));
      if (missing.length > 0) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: "Um ou mais contatos não foram encontrados",
        });
      }
    }

    const inserted = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(deals)
        .values({
          ...dealFields,
          totalValue: "0",
        })
        .returning();

      if (contactIds.length > 0) {
        await tx.insert(dealContacts).values(
          contactIds.map((contactId) => ({
            dealId: row.id,
            contactId,
          })),
        );
      }

      return row;
    });

    await logAudit({
      userId: user.id,
      objectType: "deal",
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

    const parsed = updateDealSchema.safeParse(normalizeUpdateDealBody(request.body));
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Validation", issues: parsed.error.issues });
    }

    const [existing] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, id), notArchived(deals)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Negócio não encontrado",
      });
    }

    const stageChanging =
      parsed.data.stageId !== undefined && parsed.data.stageId !== existing.stageId;

    let responseFlags: Record<string, unknown> = {};

    if (stageChanging) {
      const [newStage] = await db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.id, parsed.data.stageId!))
        .limit(1);

      if (!newStage) {
        return reply.status(400).send({
          error: "VALIDATION_ERROR",
          message: "Etapa não encontrada",
        });
      }

      if (newStage.type === "lost") {
        if (!parsed.data.lossReason) {
          return reply.status(400).send({
            error: "VALIDATION_ERROR",
            message: "Motivo de perda obrigatório ao mover para etapa perdida",
          });
        }
      }

      if (newStage.type === "won") {
        responseFlags.requiresReceivables = true;
      }

      const [oldStage] = await db
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.id, existing.stageId))
        .limit(1);

      if (oldStage?.type === "won" && newStage.type !== "won") {
        const linkedReceivables = await db
          .select()
          .from(receivables)
          .where(eq(receivables.dealId, id));

        if (linkedReceivables.length > 0) {
          responseFlags.linkedReceivables = linkedReceivables;
        }
      }
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    if (Object.keys(patch).length === 0) {
      return reply.send({ ...existing, ...responseFlags });
    }

    const [updated] = await db
      .update(deals)
      .set(patch as Partial<InferInsertModel<typeof deals>>)
      .where(eq(deals.id, id))
      .returning();

    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      oldData[key] = (existing as Record<string, unknown>)[key];
      newData[key] = patch[key];
    }

    await logChanges({
      userId: user.id,
      objectType: "deal",
      recordId: id,
      oldData,
      newData,
    });

    if (stageChanging) {
      await logAudit({
        userId: user.id,
        objectType: "deal",
        recordId: id,
        action: "stage_changed",
        field: "stageId",
        oldValue: existing.stageId,
        newValue: parsed.data.stageId!,
      });

      if (responseFlags.requiresReceivables) {
        dispatchWebhook("negocio.won", updated, request.log);
      }
    }

    return reply.send({ ...updated, ...responseFlags });
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
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.id, id), notArchived(deals)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Negócio não encontrado",
      });
    }

    await archiveRecord(deals, id, user.id, "deal");
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
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.id, id), eq(deals.archived, true)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Negócio não encontrado ou não arquivado",
      });
    }

    await restoreRecord(deals, id, user.id, "deal");

    const [row] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, id), notArchived(deals)))
      .limit(1);

    return row;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function listLineItems(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const [deal] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(eq(deals.id, id))
      .limit(1);

    if (!deal) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Negócio não encontrado",
      });
    }

    const items = await db
      .select()
      .from(dealLineItems)
      .where(eq(dealLineItems.dealId, id));

    return reply.send({ data: items });
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function createLineItem(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const [deal] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.id, id), notArchived(deals)))
      .limit(1);

    if (!deal) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Negócio não encontrado",
      });
    }

    const parsed = createLineItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Validation", issues: parsed.error.issues });
    }

    const subtotal = calculateSubtotal(
      parsed.data.quantity,
      parsed.data.unitPrice,
      parsed.data.discountPercent
    );

    const [inserted] = await db
      .insert(dealLineItems)
      .values({
        dealId: id,
        productId: parsed.data.productId,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
        discountPercent: parsed.data.discountPercent,
        subtotal,
      })
      .returning();

    await recalcDealTotalValue(id);

    const user = request.user as { id: string };
    await logAudit({
      userId: user.id,
      objectType: "deal_line_item",
      recordId: inserted.id,
      action: "created",
    });

    return reply.status(201).send(inserted);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function updateLineItem(
  request: FastifyRequest<{ Params: { id: string; itemId: string } }>,
  reply: FastifyReply
) {
  try {
    const { id, itemId } = request.params;

    const [item] = await db
      .select()
      .from(dealLineItems)
      .where(and(eq(dealLineItems.id, itemId), eq(dealLineItems.dealId, id)))
      .limit(1);

    if (!item) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Item não encontrado",
      });
    }

    const parsed = updateLineItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Validation", issues: parsed.error.issues });
    }

    const quantity = parsed.data.quantity ?? item.quantity;
    const unitPrice = parsed.data.unitPrice ?? item.unitPrice;
    const discountPercent = parsed.data.discountPercent ?? item.discountPercent ?? "0";

    const subtotal = calculateSubtotal(quantity, unitPrice, discountPercent);

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    patch.subtotal = subtotal;

    const [updated] = await db
      .update(dealLineItems)
      .set(patch as Partial<InferInsertModel<typeof dealLineItems>>)
      .where(eq(dealLineItems.id, itemId))
      .returning();

    await recalcDealTotalValue(id);

    return reply.send(updated);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function deleteLineItem(
  request: FastifyRequest<{ Params: { id: string; itemId: string } }>,
  reply: FastifyReply
) {
  try {
    const { id, itemId } = request.params;

    const [item] = await db
      .select({ id: dealLineItems.id })
      .from(dealLineItems)
      .where(and(eq(dealLineItems.id, itemId), eq(dealLineItems.dealId, id)))
      .limit(1);

    if (!item) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Item não encontrado",
      });
    }

    await db.delete(dealLineItems).where(eq(dealLineItems.id, itemId));
    await recalcDealTotalValue(id);

    const user = request.user as { id: string };
    await logAudit({
      userId: user.id,
      objectType: "deal_line_item",
      recordId: itemId,
      action: "archived",
    });

    return reply.status(204).send();
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function linkContact(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const parsed = linkContactSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Validation", issues: parsed.error.issues });
    }

    const [deal] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(and(eq(deals.id, id), notArchived(deals)))
      .limit(1);

    if (!deal) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Negócio não encontrado",
      });
    }

    const [existing] = await db
      .select()
      .from(dealContacts)
      .where(
        and(
          eq(dealContacts.dealId, id),
          eq(dealContacts.contactId, parsed.data.contactId)
        )
      )
      .limit(1);

    if (existing) {
      return reply.status(409).send({
        error: "CONFLICT",
        message: "Contato já vinculado a este negócio",
      });
    }

    await db.insert(dealContacts).values({
      dealId: id,
      contactId: parsed.data.contactId,
    });

    const user = request.user as { id: string };
    await logAudit({
      userId: user.id,
      objectType: "deal",
      recordId: id,
      action: "updated",
      field: "contacts",
      newValue: parsed.data.contactId,
    });

    return reply.status(201).send({ dealId: id, contactId: parsed.data.contactId });
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function unlinkContact(
  request: FastifyRequest<{ Params: { id: string; contactId: string } }>,
  reply: FastifyReply
) {
  try {
    const { id, contactId } = request.params;

    const [existing] = await db
      .select()
      .from(dealContacts)
      .where(
        and(eq(dealContacts.dealId, id), eq(dealContacts.contactId, contactId))
      )
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Vínculo não encontrado",
      });
    }

    await db
      .delete(dealContacts)
      .where(
        and(eq(dealContacts.dealId, id), eq(dealContacts.contactId, contactId))
      );

    const user = request.user as { id: string };
    await logAudit({
      userId: user.id,
      objectType: "deal",
      recordId: id,
      action: "updated",
      field: "contacts",
      oldValue: contactId,
    });

    return reply.status(204).send();
  } catch (err) {
    return handleError(reply, err);
  }
}
