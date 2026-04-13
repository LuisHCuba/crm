import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { baseColumns } from "./base";
import { contactStageEnum, contactOriginEnum } from "./enums";
import { users } from "./users";
import { companies } from "./companies";

export const contacts = pgTable("contacts", {
  ...baseColumns,
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  jobTitle: text("job_title"),
  origin: contactOriginEnum("origin"),
  stage: contactStageEnum("stage").notNull().default("new"),
  responsibleId: uuid("responsible_id").references(() => users.id),
});

export const contactCompanies = pgTable("contact_companies", {
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
});
