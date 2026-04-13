import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  boolean,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./base";
import {
  financialCategoryTypeEnum,
  payableReceivableStatusEnum,
} from "./enums";
import { companies } from "./companies";
import { deals } from "./deals";
import { products } from "./products";

export const financialCategories = pgTable("financial_categories", {
  ...baseColumns,
  name: text("name").notNull(),
  type: financialCategoryTypeEnum("type").notNull(),
  active: boolean("active").notNull().default(true),
});

export const bankAccounts = pgTable("bank_accounts", {
  ...baseColumns,
  name: text("name").notNull(),
  bankName: text("bank_name"),
  branchAccount: text("branch_account"),
  initialBalance: numeric("initial_balance", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  active: boolean("active").notNull().default(true),
});

export const receivables = pgTable("receivables", {
  ...baseColumns,
  description: text("description").notNull(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  dealId: uuid("deal_id").references(() => deals.id),
  productId: uuid("product_id").references(() => products.id),
  parcelGroup: uuid("parcel_group"),
  parcelLabel: text("parcel_label"),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  status: payableReceivableStatusEnum("status").notNull().default("pending"),
  paymentDate: date("payment_date"),
  receivedValue: numeric("received_value", { precision: 12, scale: 2 }),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  categoryId: uuid("category_id").references(() => financialCategories.id),
});

export const payables = pgTable("payables", {
  ...baseColumns,
  description: text("description").notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  parcelGroup: uuid("parcel_group"),
  parcelLabel: text("parcel_label"),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  status: payableReceivableStatusEnum("status").notNull().default("pending"),
  paymentDate: date("payment_date"),
  paidValue: numeric("paid_value", { precision: 12, scale: 2 }),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  categoryId: uuid("category_id").references(() => financialCategories.id),
});
