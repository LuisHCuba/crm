import { FastifyRequest, FastifyReply } from "fastify";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "../../db/connection";
import { companies, contactCompanies, contacts, users } from "../../db/schema";
import { logAudit, logChanges } from "../../lib/audit";
import { ConflictError, NotFoundError, handleError } from "../../lib/errors";
import { buildFilters, searchFilter } from "../../lib/filters";
import {
  parsePagination,
  paginationMeta,
  paginationOffset,
} from "../../lib/pagination";
import { archiveRecord, notArchived, restoreRecord } from "../../lib/soft-delete";
import {
  createContactSchema,
  updateContactSchema,
  linkCompanySchema,
  listContatosQuerySchema,
  contatoIdParamsSchema,
  unlinkCompanyParamsSchema,
  exportContatosQuerySchema,
  importConfirmBodySchema,
} from "./contato.schemas";

const AUDIT_OBJECT = "contact";

const contactScalarKeys = [
  "fullName",
  "email",
  "phone",
  "jobTitle",
  "origin",
  "stage",
  "responsibleId",
] as const;

function pickContactAudit(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of contactScalarKeys) {
    out[k] = row[k];
  }
  return out;
}

export async function list(request: FastifyRequest, reply: FastifyReply) {
  try {
    const q = listContatosQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send({ error: "Validation", issues: q.error.issues });
    }

    const query = q.data;
    const pagination = parsePagination({
      page: query.page,
      perPage: query.perPage,
    } as Record<string, unknown>);
    const offset = paginationOffset(pagination);

    const conditions: SQL[] = [];
    const includeArchived = (request.query as any).includeArchived === "true";
    const emailLookup = Boolean(query.email);
    if (!includeArchived && !emailLookup) {
      conditions.push(notArchived(contacts));
    }

    conditions.push(
      ...buildFilters(query as Record<string, unknown>, [
        { field: contacts.stage, type: "eq", param: "stage" },
        { field: contacts.responsibleId, type: "eq", param: "responsibleId" },
      ])
    );

    const searchSql = searchFilter(
      [contacts.fullName, contacts.email],
      query.search ?? ""
    );
    if (searchSql) conditions.push(searchSql);

    if (query.email) {
      const norm = query.email.trim().toLowerCase();
      conditions.push(sql`lower(${contacts.email}) = ${norm}`);
    }

    const whereBase = and(...conditions);

    if (query.companyId && !query.email) {
      const whereAll = and(whereBase, eq(contactCompanies.companyId, query.companyId));

      const [countRow] = await db
        .select({
          n: sql<number>`count(distinct ${contacts.id})::int`,
        })
        .from(contacts)
        .innerJoin(contactCompanies, eq(contacts.id, contactCompanies.contactId))
        .where(whereAll);

      const total = Number(countRow?.n ?? 0);

      const rows = await db
        .select({ contact: contacts })
        .from(contacts)
        .innerJoin(contactCompanies, eq(contacts.id, contactCompanies.contactId))
        .where(whereAll)
        .orderBy(desc(contacts.createdAt))
        .limit(pagination.perPage)
        .offset(offset);

      return {
        data: rows.map((r) => r.contact),
        pagination: paginationMeta(total, pagination),
      };
    }

    const [countRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(contacts)
      .where(whereBase);

    const total = Number(countRow?.n ?? 0);

    const data = await db
      .select()
      .from(contacts)
      .where(whereBase)
      .orderBy(desc(contacts.createdAt))
      .limit(pagination.perPage)
      .offset(offset);

    return {
      data,
      pagination: paginationMeta(total, pagination),
    };
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  try {
    const params = contatoIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Validation", issues: params.error.issues });
    }

    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, params.data.id),
    });
    if (!contact) {
      throw new NotFoundError("Contato não encontrado");
    }

    const linked = await db
      .select({ company: companies })
      .from(contactCompanies)
      .innerJoin(companies, eq(contactCompanies.companyId, companies.id))
      .where(eq(contactCompanies.contactId, params.data.id));

    return {
      ...contact,
      companies: linked.map((l) => l.company),
    };
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: userId } = request.user as { id: string };

    const parsed = createContactSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const body = parsed.data;

    const existing = await db.query.contacts.findFirst({
      where: eq(contacts.email, body.email),
    });
    if (existing) {
      throw new ConflictError("E-mail já cadastrado para outro contato");
    }

    const [row] = await db
      .insert(contacts)
      .values({
        fullName: body.fullName,
        email: body.email,
        phone: body.phone ?? null,
        jobTitle: body.jobTitle ?? null,
        origin: body.origin ?? null,
        stage: body.stage,
        responsibleId: body.responsibleId ?? null,
      })
      .returning();

    await logAudit({
      userId,
      objectType: AUDIT_OBJECT,
      recordId: row.id,
      action: "created",
    });

    return reply.status(201).send(row);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: userId } = request.user as { id: string };

    const params = contatoIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Validation", issues: params.error.issues });
    }

    const parsed = updateContactSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const body = parsed.data;

    const current = await db.query.contacts.findFirst({
      where: eq(contacts.id, params.data.id),
    });
    if (!current) {
      throw new NotFoundError("Contato não encontrado");
    }

    if (body.email && body.email !== current.email) {
      const taken = await db.query.contacts.findFirst({
        where: eq(contacts.email, body.email),
      });
      if (taken) {
        throw new ConflictError("E-mail já cadastrado para outro contato");
      }
    }

    const patch = {
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle } : {}),
      ...(body.origin !== undefined ? { origin: body.origin } : {}),
      ...(body.stage !== undefined ? { stage: body.stage } : {}),
      ...(body.responsibleId !== undefined
        ? { responsibleId: body.responsibleId }
        : {}),
    };

    const [updated] = await db
      .update(contacts)
      .set(patch)
      .where(eq(contacts.id, params.data.id))
      .returning();

    const oldData = pickContactAudit(current as Record<string, unknown>);
    const newData: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      newData[key] = (updated as Record<string, unknown>)[key];
    }

    await logChanges({
      userId,
      objectType: AUDIT_OBJECT,
      recordId: params.data.id,
      oldData,
      newData,
    });

    return updated;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function archive(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: userId } = request.user as { id: string };

    const params = contatoIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Validation", issues: params.error.issues });
    }

    const current = await db.query.contacts.findFirst({
      where: eq(contacts.id, params.data.id),
    });
    if (!current) {
      throw new NotFoundError("Contato não encontrado");
    }

    await archiveRecord(contacts, params.data.id, userId, AUDIT_OBJECT);
    return reply.status(204).send();
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function restore(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: userId } = request.user as { id: string };

    const params = contatoIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Validation", issues: params.error.issues });
    }

    const current = await db.query.contacts.findFirst({
      where: eq(contacts.id, params.data.id),
    });
    if (!current) {
      throw new NotFoundError("Contato não encontrado");
    }

    await restoreRecord(contacts, params.data.id, userId, AUDIT_OBJECT);
    return { message: "Contato restaurado" };
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function linkCompany(request: FastifyRequest, reply: FastifyReply) {
  try {
    const params = contatoIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Validation", issues: params.error.issues });
    }

    const parsed = linkCompanySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, params.data.id),
    });
    if (!contact) {
      throw new NotFoundError("Contato não encontrado");
    }

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, parsed.data.companyId),
    });
    if (!company) {
      throw new NotFoundError("Empresa não encontrada");
    }

    const [existingLink] = await db
      .select()
      .from(contactCompanies)
      .where(
        and(
          eq(contactCompanies.contactId, params.data.id),
          eq(contactCompanies.companyId, parsed.data.companyId)
        )
      )
      .limit(1);
    if (existingLink) {
      throw new ConflictError("Contato já vinculado a esta empresa");
    }

    await db.insert(contactCompanies).values({
      contactId: params.data.id,
      companyId: parsed.data.companyId,
    });

    const { id: userId } = request.user as { id: string };
    await logAudit({
      userId,
      objectType: "contact",
      recordId: params.data.id,
      action: "updated",
      field: "companies",
      newValue: parsed.data.companyId,
    });

    return reply.status(201).send({ message: "Empresa vinculada" });
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function unlinkCompany(request: FastifyRequest, reply: FastifyReply) {
  try {
    const params = unlinkCompanyParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Validation", issues: params.error.issues });
    }

    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, params.data.id),
    });
    if (!contact) {
      throw new NotFoundError("Contato não encontrado");
    }

    const result = await db
      .delete(contactCompanies)
      .where(
        and(
          eq(contactCompanies.contactId, params.data.id),
          eq(contactCompanies.companyId, params.data.companyId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new NotFoundError("Vínculo não encontrado");
    }

    const { id: userId } = request.user as { id: string };
    await logAudit({
      userId,
      objectType: "contact",
      recordId: params.data.id,
      action: "updated",
      field: "companies",
      oldValue: params.data.companyId,
    });

    return reply.status(204).send();
  } catch (err) {
    return handleError(reply, err);
  }
}

const STAGE_LABELS: Record<string, string> = {
  new: "Novo",
  qualified: "Qualificado",
  active_client: "Cliente ativo",
  inactive: "Inativo",
};

const ORIGIN_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Indicação",
  event: "Evento",
  other: "Outro",
};

export async function exportContatos(request: FastifyRequest, reply: FastifyReply) {
  try {
    const q = exportContatosQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send({ error: "Validation", issues: q.error.issues });
    }

    const query = q.data;
    const conditions: SQL[] = [notArchived(contacts)];

    if (query.scope === "filtered") {
      conditions.push(
        ...buildFilters(query as Record<string, unknown>, [
          { field: contacts.stage, type: "eq", param: "stage" },
          { field: contacts.responsibleId, type: "eq", param: "responsibleId" },
        ])
      );

      const searchSql = searchFilter(
        [contacts.fullName, contacts.email],
        query.search ?? ""
      );
      if (searchSql) conditions.push(searchSql);
    }

    const whereBase = and(...conditions);

    let data: (typeof contacts.$inferSelect)[];

    if (query.scope === "filtered" && query.companyId) {
      const whereAll = and(whereBase, eq(contactCompanies.companyId, query.companyId));
      const rows = await db
        .select({ contact: contacts })
        .from(contacts)
        .innerJoin(contactCompanies, eq(contacts.id, contactCompanies.contactId))
        .where(whereAll)
        .orderBy(desc(contacts.createdAt));
      data = rows.map((r) => r.contact);
    } else {
      data = await db
        .select()
        .from(contacts)
        .where(whereBase)
        .orderBy(desc(contacts.createdAt));
    }

    const contactIds = data.map((c) => c.id);

    const companyLinks =
      contactIds.length > 0
        ? await db
            .select({
              contactId: contactCompanies.contactId,
              companyName: companies.legalName,
            })
            .from(contactCompanies)
            .innerJoin(companies, eq(contactCompanies.companyId, companies.id))
            .where(inArray(contactCompanies.contactId, contactIds))
        : [];

    const companyMap = new Map<string, string[]>();
    for (const link of companyLinks) {
      const list = companyMap.get(link.contactId) ?? [];
      list.push(link.companyName);
      companyMap.set(link.contactId, list);
    }

    const responsibleIds = [
      ...new Set(data.map((c) => c.responsibleId).filter(Boolean)),
    ] as string[];

    const responsibleRows =
      responsibleIds.length > 0
        ? await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, responsibleIds))
        : [];

    const responsibleMap = new Map<string, string>();
    for (const u of responsibleRows) {
      responsibleMap.set(u.id, u.name);
    }

    const rows = data.map((c) => ({
      Nome: c.fullName,
      "E-mail": c.email,
      Telefone: c.phone ?? "",
      Cargo: c.jobTitle ?? "",
      Origem: c.origin ? (ORIGIN_LABELS[c.origin] ?? c.origin) : "",
      Estágio: STAGE_LABELS[c.stage] ?? c.stage,
      Empresas: (companyMap.get(c.id) ?? []).join(", "),
      Responsável: c.responsibleId
        ? (responsibleMap.get(c.responsibleId) ?? "")
        : "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return reply
      .header(
        "Content-Disposition",
        'attachment; filename="contatos.xlsx"'
      )
      .header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .send(buffer);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function importPreview(request: FastifyRequest, reply: FastifyReply) {
  try {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: "Arquivo não enviado" });
    }

    const buffer = await file.toBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return reply.status(400).send({ error: "Planilha vazia" });
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const existingContacts = await db
      .select({ id: contacts.id, email: contacts.email })
      .from(contacts)
      .where(notArchived(contacts));

    const emailMap = new Map<string, string>();
    for (const c of existingContacts) {
      emailMap.set(c.email.toLowerCase(), c.id);
    }

    const rows = jsonRows.map((raw, index) => {
      const email = String(raw["E-mail"] ?? raw["email"] ?? raw["Email"] ?? "").trim();
      const emailLower = email.toLowerCase();
      const existingId = emailLower ? (emailMap.get(emailLower) ?? null) : null;

      return {
        rowNumber: index + 2,
        data: {
          fullName: String(raw["Nome"] ?? raw["nome"] ?? raw["fullName"] ?? "").trim(),
          email,
          phone: String(raw["Telefone"] ?? raw["telefone"] ?? raw["phone"] ?? "").trim() || null,
          jobTitle: String(raw["Cargo"] ?? raw["cargo"] ?? raw["jobTitle"] ?? "").trim() || null,
          origin: String(raw["Origem"] ?? raw["origem"] ?? raw["origin"] ?? "").trim() || null,
          stage: String(raw["Estágio"] ?? raw["estagio"] ?? raw["stage"] ?? "").trim() || null,
        },
        status: existingId ? ("duplicate" as const) : ("new" as const),
        existingId,
      };
    });

    return { rows };
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function importConfirm(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: userId } = request.user as { id: string };

    const parsed = importConfirmBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of parsed.data.rows) {
      if (row.action === "skip") {
        skipped++;
        continue;
      }

      if (row.action === "create") {
        const [inserted] = await db
          .insert(contacts)
          .values({
            fullName: row.data.fullName,
            email: row.data.email,
            phone: row.data.phone ?? null,
            jobTitle: row.data.jobTitle ?? null,
            origin: (row.data.origin as any) ?? null,
            stage: (row.data.stage as any) ?? "new",
          })
          .returning();

        await logAudit({
          userId,
          objectType: AUDIT_OBJECT,
          recordId: inserted.id,
          action: "created",
        });

        created++;
      }

      if (row.action === "update" && row.existingId) {
        const patch: Record<string, unknown> = {
          fullName: row.data.fullName,
          email: row.data.email,
        };
        if (row.data.phone !== undefined) patch.phone = row.data.phone;
        if (row.data.jobTitle !== undefined) patch.jobTitle = row.data.jobTitle;
        if (row.data.origin) patch.origin = row.data.origin;
        if (row.data.stage) patch.stage = row.data.stage;

        const current = await db.query.contacts.findFirst({
          where: eq(contacts.id, row.existingId),
        });

        await db
          .update(contacts)
          .set(patch)
          .where(eq(contacts.id, row.existingId));

        if (current) {
          const oldData = pickContactAudit(current as Record<string, unknown>);
          await logChanges({
            userId,
            objectType: AUDIT_OBJECT,
            recordId: row.existingId,
            oldData,
            newData: patch,
          });
        }

        updated++;
      }
    }

    return { created, updated, skipped };
  } catch (err) {
    return handleError(reply, err);
  }
}
