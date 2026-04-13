import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./base";
import { priorityEnum, projectMacroGroupEnum } from "./enums";
import { deals } from "./deals";
import { users } from "./users";

export const projects = pgTable("projects", {
  ...baseColumns,
  title: text("title").notNull(),
  description: text("description"),
  dealId: uuid("deal_id").references(() => deals.id),
  plannedStartDate: date("planned_start_date"),
  plannedEndDate: date("planned_end_date"),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
});

export const projectResponsibles = pgTable("project_responsibles", {
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
});

export const projectStages = pgTable("project_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  percentage: integer("percentage").notNull(),
  macroGroup: projectMacroGroupEnum("macro_group").notNull(),
  order: integer("order").notNull(),
});

export const projectTasks = pgTable("project_tasks", {
  ...baseColumns,
  title: text("title").notNull(),
  description: text("description"),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  responsibleId: uuid("responsible_id").references(() => users.id),
  stageId: uuid("stage_id")
    .notNull()
    .references(() => projectStages.id),
  priority: priorityEnum("priority"),
  plannedStartDate: date("planned_start_date"),
  plannedEndDate: date("planned_end_date"),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  dependsOnTaskId: uuid("depends_on_task_id"),
});

export const projectSubtasks = pgTable("project_subtasks", {
  ...baseColumns,
  title: text("title").notNull(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => projectTasks.id),
  responsibleId: uuid("responsible_id").references(() => users.id),
  stageId: uuid("stage_id")
    .notNull()
    .references(() => projectStages.id),
});
