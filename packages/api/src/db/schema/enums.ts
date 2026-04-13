import { pgEnum } from "drizzle-orm/pg-core";

export const companyTypeEnum = pgEnum("company_type", [
  "client",
  "supplier",
  "both",
]);

export const contactStageEnum = pgEnum("contact_stage", [
  "new",
  "qualified",
  "active_client",
  "inactive",
]);

export const contactOriginEnum = pgEnum("contact_origin", [
  "website",
  "referral",
  "event",
  "other",
]);

export const pipelineStageTypeEnum = pgEnum("pipeline_stage_type", [
  "open",
  "won",
  "lost",
]);

export const dealLossReasonEnum = pgEnum("deal_loss_reason", [
  "price",
  "competition",
  "timing",
  "no_response",
  "other",
]);

export const financialCategoryTypeEnum = pgEnum("financial_category_type", [
  "revenue",
  "expense",
]);

export const payableReceivableStatusEnum = pgEnum("payable_receivable_status", [
  "pending",
  "paid",
  "overdue",
  "cancelled",
]);

export const recurrenceEnum = pgEnum("recurrence", [
  "none",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
]);

export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);

export const projectMacroGroupEnum = pgEnum("project_macro_group", [
  "not_started",
  "in_progress",
  "completed",
  "paused",
  "cancelled",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "reminder",
  "note",
  "call",
  "meeting",
  "email",
]);

export const callResultEnum = pgEnum("call_result", [
  "answered",
  "no_answer",
  "voicemail",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "created",
  "updated",
  "archived",
  "restored",
  "stage_changed",
]);

export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
