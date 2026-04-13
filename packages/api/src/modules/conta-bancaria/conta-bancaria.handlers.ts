import { FastifyRequest, FastifyReply } from "fastify";
import { and, eq, sql, type InferInsertModel } from "drizzle-orm";
import { db } from "../../db/connection";
import { bankAccounts, receivables, payables } from "../../db/schema";
import { logAudit, logChanges } from "../../lib/audit";
import { handleError } from "../../lib/errors";
import { notArchived, archiveRecord, restoreRecord } from "../../lib/soft-delete";
import {
  createContaBancariaSchema,
  updateContaBancariaSchema,
  extratoQuerySchema,
} from "./conta-bancaria.schemas";

function currentBalanceSql(accountId: string) {
  return sql<string>`
    (
      SELECT COALESCE(ba.initial_balance, '0')
        + COALESCE((
            SELECT SUM(r.received_value)
            FROM receivables r
            WHERE r.bank_account_id = ba.id AND r.status = 'paid'
          ), 0)
        - COALESCE((
            SELECT SUM(p.paid_value)
            FROM payables p
            WHERE p.bank_account_id = ba.id AND p.status = 'paid'
          ), 0)
      FROM bank_accounts ba
      WHERE ba.id = ${accountId}
    )
  `;
}

async function listWithBalance() {
  const balances = await db.execute<{
    id: string;
    current_balance: string;
  }>(sql`
    SELECT
      ba.id,
      (
        ba.initial_balance::numeric
        + COALESCE((
            SELECT SUM(r.received_value)
            FROM receivables r
            WHERE r.bank_account_id = ba.id AND r.status = 'paid'
          ), 0)
        - COALESCE((
            SELECT SUM(p.paid_value)
            FROM payables p
            WHERE p.bank_account_id = ba.id AND p.status = 'paid'
          ), 0)
      )::text AS current_balance
    FROM bank_accounts ba
    WHERE ba.archived = false
  `);

  const balanceMap = new Map<string, string>();
  for (const b of balances as unknown as Array<{ id: string; current_balance: string }>) {
    balanceMap.set(b.id, b.current_balance);
  }

  const rows = await db
    .select()
    .from(bankAccounts)
    .where(notArchived(bankAccounts));

  return rows.map((row) => ({
    ...row,
    currentBalance: balanceMap.get(row.id) ?? row.initialBalance,
  }));
}

export async function list(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = await listWithBalance();
    return reply.send({ data });
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
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, id), notArchived(bankAccounts)))
      .limit(1);

    if (!row) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado" });
    }

    const [balance] = await db.execute<{ current_balance: string }>(sql`
      SELECT
        ${row.initialBalance}::numeric
        + COALESCE((
            SELECT SUM(r.received_value)
            FROM receivables r
            WHERE r.bank_account_id = ${row.id} AND r.status = 'paid'
          ), 0)
        - COALESCE((
            SELECT SUM(p.paid_value)
            FROM payables p
            WHERE p.bank_account_id = ${row.id} AND p.status = 'paid'
          ), 0)
      AS current_balance
    `);

    return { ...row, currentBalance: (balance as any).current_balance ?? row.initialBalance };
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
    const parsed = createContaBancariaSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [inserted] = await db
      .insert(bankAccounts)
      .values(parsed.data)
      .returning();

    await logAudit({
      userId: user.id,
      objectType: "bank_account",
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

    const parsed = updateContaBancariaSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [existing] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, id), notArchived(bankAccounts)))
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
      .update(bankAccounts)
      .set(patch as Partial<InferInsertModel<typeof bankAccounts>>)
      .where(eq(bankAccounts.id, id))
      .returning();

    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      oldData[key] = (existing as Record<string, unknown>)[key];
      newData[key] = patch[key];
    }

    await logChanges({
      userId: user.id,
      objectType: "bank_account",
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
      .select({ id: bankAccounts.id })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, id), notArchived(bankAccounts)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado" });
    }

    await archiveRecord(bankAccounts, id, user.id, "bank_account");
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
      .select({ id: bankAccounts.id })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.archived, true)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Registro não encontrado ou não arquivado" });
    }

    await restoreRecord(bankAccounts, id, user.id, "bank_account");

    const [row] = await db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, id), notArchived(bankAccounts)))
      .limit(1);

    return row;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function getExtrato(
  request: FastifyRequest<{ Params: { id: string }; Querystring: Record<string, unknown> }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const query = extratoQuerySchema.safeParse(request.query);
  if (!query.success) {
    return reply.status(400).send({ error: "Validation", issues: query.error.issues });
  }

  const { page, perPage, dateFrom, dateTo } = query.data;

  const [account] = await db
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.id, id), notArchived(bankAccounts)))
    .limit(1);

  if (!account) {
    return reply.status(404).send({ error: "NOT_FOUND", message: "Conta não encontrada" });
  }

  let dateFilterRec = sql``;
  let dateFilterPay = sql``;
  if (dateFrom) {
    dateFilterRec = sql`${dateFilterRec} AND r.payment_date >= ${dateFrom}`;
    dateFilterPay = sql`${dateFilterPay} AND p.payment_date >= ${dateFrom}`;
  }
  if (dateTo) {
    dateFilterRec = sql`${dateFilterRec} AND r.payment_date <= ${dateTo}`;
    dateFilterPay = sql`${dateFilterPay} AND p.payment_date <= ${dateTo}`;
  }

  const offset = (page - 1) * perPage;

  const countResult = await db.execute<{ total: string }>(sql`
    SELECT COUNT(*) AS total FROM (
      SELECT r.id FROM receivables r
      WHERE r.bank_account_id = ${id} AND r.status = 'paid' ${dateFilterRec}
      UNION ALL
      SELECT p.id FROM payables p
      WHERE p.bank_account_id = ${id} AND p.status = 'paid' ${dateFilterPay}
    ) movements
  `);
  const total = Number((countResult[0] as any).total);

  const movements = await db.execute<{
    date: string;
    description: string;
    type: string;
    value: string;
  }>(sql`
    SELECT date, description, type, value FROM (
      SELECT
        r.payment_date AS date,
        r.description,
        'entrada' AS type,
        r.received_value AS value
      FROM receivables r
      WHERE r.bank_account_id = ${id} AND r.status = 'paid' ${dateFilterRec}
      UNION ALL
      SELECT
        p.payment_date AS date,
        p.description,
        'saida' AS type,
        p.paid_value AS value
      FROM payables p
      WHERE p.bank_account_id = ${id} AND p.status = 'paid' ${dateFilterPay}
    ) movements
    ORDER BY date DESC, type ASC
    LIMIT ${perPage} OFFSET ${offset}
  `);

  const allBeforeOffset = await db.execute<{
    sum_entradas: string;
    sum_saidas: string;
  }>(sql`
    SELECT
      COALESCE((
        SELECT SUM(r.received_value) FROM receivables r
        WHERE r.bank_account_id = ${id} AND r.status = 'paid'
          ${dateFrom ? sql`AND r.payment_date >= ${dateFrom}` : sql``}
          ${dateTo ? sql`AND r.payment_date <= ${dateTo}` : sql``}
      ), 0) AS sum_entradas,
      COALESCE((
        SELECT SUM(p.paid_value) FROM payables p
        WHERE p.bank_account_id = ${id} AND p.status = 'paid'
          ${dateFrom ? sql`AND p.payment_date >= ${dateFrom}` : sql``}
          ${dateTo ? sql`AND p.payment_date <= ${dateTo}` : sql``}
      ), 0) AS sum_saidas
  `);

  const initialBal = Number(account.initialBalance);
  const rowsArr = movements as unknown as Array<{
    date: string;
    description: string;
    type: string;
    value: string;
  }>;

  const sumBefore = await db.execute<{
    sum_entradas: string;
    sum_saidas: string;
  }>(sql`
    SELECT
      COALESCE(SUM(CASE WHEN m.type = 'entrada' THEN m.value ELSE 0 END), 0) AS sum_entradas,
      COALESCE(SUM(CASE WHEN m.type = 'saida' THEN m.value ELSE 0 END), 0) AS sum_saidas
    FROM (
      SELECT 'entrada' AS type, r.received_value::numeric AS value, r.payment_date AS date
      FROM receivables r
      WHERE r.bank_account_id = ${id} AND r.status = 'paid'
        ${dateFrom ? sql`AND r.payment_date >= ${dateFrom}` : sql``}
        ${dateTo ? sql`AND r.payment_date <= ${dateTo}` : sql``}
      UNION ALL
      SELECT 'saida' AS type, p.paid_value::numeric AS value, p.payment_date AS date
      FROM payables p
      WHERE p.bank_account_id = ${id} AND p.status = 'paid'
        ${dateFrom ? sql`AND p.payment_date >= ${dateFrom}` : sql``}
        ${dateTo ? sql`AND p.payment_date <= ${dateTo}` : sql``}
    ) m
  `);

  const totals = sumBefore as unknown as Array<{ sum_entradas: string; sum_saidas: string }>;
  const totalEntradas = Number(totals[0]?.sum_entradas ?? 0);
  const totalSaidas = Number(totals[0]?.sum_saidas ?? 0);

  const skipRows = offset > 0
    ? await db.execute<{ sum_entradas: string; sum_saidas: string }>(sql`
        SELECT
          COALESCE(SUM(CASE WHEN m.type = 'entrada' THEN m.value ELSE 0 END), 0) AS sum_entradas,
          COALESCE(SUM(CASE WHEN m.type = 'saida' THEN m.value ELSE 0 END), 0) AS sum_saidas
        FROM (
          SELECT date, type, value FROM (
            SELECT r.payment_date AS date, 'entrada' AS type, r.received_value::numeric AS value
            FROM receivables r
            WHERE r.bank_account_id = ${id} AND r.status = 'paid'
              ${dateFrom ? sql`AND r.payment_date >= ${dateFrom}` : sql``}
              ${dateTo ? sql`AND r.payment_date <= ${dateTo}` : sql``}
            UNION ALL
            SELECT p.payment_date AS date, 'saida' AS type, p.paid_value::numeric AS value
            FROM payables p
            WHERE p.bank_account_id = ${id} AND p.status = 'paid'
              ${dateFrom ? sql`AND p.payment_date >= ${dateFrom}` : sql``}
              ${dateTo ? sql`AND p.payment_date <= ${dateTo}` : sql``}
          ) all_m
          ORDER BY date DESC, type ASC
          LIMIT ${offset}
        ) m
      `)
    : null;

  const skipEntradas = Number((skipRows as unknown as Array<{ sum_entradas: string }>)?.[0]?.sum_entradas ?? 0);
  const skipSaidas = Number((skipRows as unknown as Array<{ sum_saidas: string }>)?.[0]?.sum_saidas ?? 0);

  let runningBal = initialBal + totalEntradas - totalSaidas - skipEntradas + skipSaidas;

  const data = rowsArr.map((row) => {
    const entry = {
      date: row.date,
      description: row.description,
      type: row.type,
      value: row.value,
      runningBalance: runningBal.toFixed(2),
    };
    if (row.type === "entrada") runningBal -= Number(row.value);
    else runningBal += Number(row.value);
    return entry;
  });

    return reply.send({
      data,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (err) {
    return handleError(reply, err);
  }
}
