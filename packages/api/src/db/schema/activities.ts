import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { activityTypeEnum, callResultEnum } from "./enums";
import { users } from "./users";

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: activityTypeEnum("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),

  linkedCompanyId: uuid("linked_company_id"),
  linkedContactId: uuid("linked_contact_id"),
  linkedDealId: uuid("linked_deal_id"),
  linkedProjectId: uuid("linked_project_id"),
  linkedTaskId: uuid("linked_task_id"),

  title: text("title"),
  body: text("body"),

  reminderDueDate: timestamp("reminder_due_date", { withTimezone: true }),
  reminderCompleted: timestamp("reminder_completed_at", {
    withTimezone: true,
  }),
  reminderResponsibleId: uuid("reminder_responsible_id").references(
    () => users.id
  ),

  callDurationMinutes: integer("call_duration_minutes"),
  callResult: callResultEnum("call_result"),

  meetingDate: timestamp("meeting_date", { withTimezone: true }),
  meetingParticipants: text("meeting_participants"),

  emailSubject: text("email_subject"),
});
