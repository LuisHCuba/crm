import { z } from "zod";

const macroGroupEnum = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "paused",
  "cancelled",
]);

export const createProjectSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
  plannedStartDate: z.string().nullable().optional(),
  plannedEndDate: z.string().nullable().optional(),
  responsibleIds: z.array(z.string().uuid()).min(1, "Informe ao menos um responsável"),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
  plannedStartDate: z.string().nullable().optional(),
  plannedEndDate: z.string().nullable().optional(),
});

export const createStageSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  percentage: z.number().int().min(0).max(100),
  macroGroup: macroGroupEnum,
  order: z.number().int(),
});

export const updateStageSchema = z.object({
  name: z.string().min(1).optional(),
  percentage: z.number().int().min(0).max(100).optional(),
  macroGroup: macroGroupEnum.optional(),
  order: z.number().int().optional(),
});

export const reorderStagesSchema = z.object({
  stages: z
    .array(z.object({ id: z.string().uuid(), order: z.number().int() }))
    .min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;
