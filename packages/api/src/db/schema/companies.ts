import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { baseColumns } from "./base";
import { companyTypeEnum } from "./enums";
import { users } from "./users";

export const companies = pgTable("companies", {
  ...baseColumns,
  legalName: text("legal_name").notNull(),
  tradeName: text("trade_name"),
  document: text("document").notNull().unique(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  type: companyTypeEnum("type").notNull(),
  responsibleId: uuid("responsible_id").references(() => users.id),
});
