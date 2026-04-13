import { eq, and, SQL } from "drizzle-orm";
import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { db } from "../db/connection";
import { logAudit } from "./audit";

export function notArchived(table: { archived: any }): SQL {
  return eq(table.archived, false);
}

export async function archiveRecord(
  table: any,
  id: string,
  userId: string,
  objectType: string
) {
  await db.update(table).set({ archived: true }).where(eq(table.id, id));
  await logAudit({
    userId,
    objectType,
    recordId: id,
    action: "archived",
  });
}

export async function restoreRecord(
  table: any,
  id: string,
  userId: string,
  objectType: string
) {
  await db.update(table).set({ archived: false }).where(eq(table.id, id));
  await logAudit({
    userId,
    objectType,
    recordId: id,
    action: "restored",
  });
}
