import { db } from "../db/connection";
import { auditLog } from "../db/schema";
import type { auditActionEnum } from "../db/schema";

type AuditAction = (typeof auditActionEnum.enumValues)[number];

export async function logAudit(params: {
  userId: string;
  objectType: string;
  recordId: string;
  action: AuditAction;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  await db.insert(auditLog).values({
    userId: params.userId,
    objectType: params.objectType,
    recordId: params.recordId,
    action: params.action,
    field: params.field ?? null,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
  });
}

export async function logChanges(params: {
  userId: string;
  objectType: string;
  recordId: string;
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
}) {
  const { userId, objectType, recordId, oldData, newData } = params;

  for (const key of Object.keys(newData)) {
    const oldVal = oldData[key];
    const newVal = newData[key];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      await logAudit({
        userId,
        objectType,
        recordId,
        action: "updated",
        field: key,
        oldValue: oldVal != null ? String(oldVal) : null,
        newValue: newVal != null ? String(newVal) : null,
      });
    }
  }
}
