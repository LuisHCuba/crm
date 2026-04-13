import { z } from "zod";

const priorityEnum = z.enum(["low", "medium", "high"]);

export const createTaskSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().nullable().optional(),
  projectId: z.string().uuid(),
  responsibleId: z.string().uuid().nullable().optional(),
  stageId: z.string().uuid(),
  priority: priorityEnum.nullable().optional(),
  plannedStartDate: z.string().nullable().optional(),
  plannedEndDate: z.string().nullable().optional(),
  dependsOnTaskId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  responsibleId: z.string().uuid().nullable().optional(),
  stageId: z.string().uuid().optional(),
  priority: priorityEnum.nullable().optional(),
  plannedStartDate: z.string().nullable().optional(),
  plannedEndDate: z.string().nullable().optional(),
  dependsOnTaskId: z.string().uuid().nullable().optional(),
});

export const createSubtaskSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  taskId: z.string().uuid(),
  responsibleId: z.string().uuid().nullable().optional(),
  stageId: z.string().uuid(),
});

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).optional(),
  responsibleId: z.string().uuid().nullable().optional(),
  stageId: z.string().uuid().optional(),
});

export const listTarefasQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  stageId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export const listAllTarefasQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  projectId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  macroGroup: z.enum(["not_started", "in_progress", "completed", "paused", "cancelled"]).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;
