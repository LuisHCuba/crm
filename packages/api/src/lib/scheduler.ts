import { and, eq, lt } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { db } from "../db/connection";
import { receivables, payables } from "../db/schema";

/**
 * Vira contas vencidas e ainda pendentes para o status "overdue".
 * Roda sobre receivables e payables. Idempotente: só afeta status "pending"
 * com vencimento anterior a hoje.
 */
export async function markOverdue(logger?: FastifyBaseLogger) {
  const today = new Date().toISOString().split("T")[0];

  const overdueReceivables = await db
    .update(receivables)
    .set({ status: "overdue" })
    .where(
      and(
        eq(receivables.status, "pending"),
        eq(receivables.archived, false),
        lt(receivables.dueDate, today)
      )
    )
    .returning({ id: receivables.id });

  const overduePayables = await db
    .update(payables)
    .set({ status: "overdue" })
    .where(
      and(
        eq(payables.status, "pending"),
        eq(payables.archived, false),
        lt(payables.dueDate, today)
      )
    )
    .returning({ id: payables.id });

  logger?.info(
    `[overdue] marcadas ${overdueReceivables.length} a receber e ${overduePayables.length} a pagar como atrasadas`
  );

  return {
    receivables: overdueReceivables.length,
    payables: overduePayables.length,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Agenda os jobs recorrentes. Executa uma vez no boot e depois a cada 24h.
 * Sem dependência externa: usa setInterval e não bloqueia o processo (unref).
 */
export function startScheduledJobs(logger?: FastifyBaseLogger) {
  const run = () =>
    markOverdue(logger).catch((err) =>
      logger?.error(err, "[overdue] job falhou")
    );

  run();

  const timer = setInterval(run, DAY_MS);
  if (typeof (timer as { unref?: () => void }).unref === "function") {
    (timer as { unref: () => void }).unref();
  }
}
