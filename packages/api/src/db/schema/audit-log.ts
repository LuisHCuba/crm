import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { auditActionEnum } from "./enums";
import { users } from "./users";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  objectType: text("object_type").notNull(),
  recordId: uuid("record_id").notNull(),
  action: auditActionEnum("action").notNull(),
  field: text("field"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
});
