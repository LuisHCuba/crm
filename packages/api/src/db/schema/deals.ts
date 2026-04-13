import {
  pgTable,
  primaryKey,
  uuid,
  text,
  numeric,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./base";
import { dealLossReasonEnum } from "./enums";
import { companies } from "./companies";
import { contacts } from "./contacts";
import { users } from "./users";
import { pipelines, pipelineStages } from "./pipelines";
import { products } from "./products";

export const deals = pgTable("deals", {
  ...baseColumns,
  title: text("title").notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  pipelineId: uuid("pipeline_id")
    .notNull()
    .references(() => pipelines.id),
  stageId: uuid("stage_id")
    .notNull()
    .references(() => pipelineStages.id),
  totalValue: numeric("total_value", { precision: 12, scale: 2 }),
  forecastDate: date("forecast_date"),
  responsibleId: uuid("responsible_id")
    .notNull()
    .references(() => users.id),
  lossReason: dealLossReasonEnum("loss_reason"),
});

export const dealContacts = pgTable(
  "deal_contacts",
  {
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
  },
  (t) => [primaryKey({ columns: [t.dealId, t.contactId] })],
);

export const dealLineItems = pgTable("deal_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});
