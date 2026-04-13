import { pgTable, uuid, text, boolean, integer } from "drizzle-orm/pg-core";
import { baseColumns } from "./base";
import { pipelineStageTypeEnum } from "./enums";

export const pipelines = pgTable("pipelines", {
  ...baseColumns,
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});

export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: uuid("pipeline_id")
    .notNull()
    .references(() => pipelines.id),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  type: pipelineStageTypeEnum("type").notNull().default("open"),
});
