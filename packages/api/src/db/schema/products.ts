import { pgTable, text, numeric, boolean } from "drizzle-orm/pg-core";
import { baseColumns } from "./base";

export const products = pgTable("products", {
  ...baseColumns,
  name: text("name").notNull(),
  sku: text("sku").unique(),
  description: text("description"),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  active: boolean("active").notNull().default(true),
});
