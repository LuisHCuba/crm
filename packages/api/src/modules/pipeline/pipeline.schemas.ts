import { z } from "zod";

const stageTypeSchema = z.enum(["open", "won", "lost"]);

export const createPipelineSchema = z.object({
  name: z.string().min(1),
  active: z.boolean().optional().default(true),
});

export const updatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export const createStageSchema = z.object({
  name: z.string().min(1),
  order: z.number().int(),
  type: stageTypeSchema,
});

export const updateStageSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().int().optional(),
  type: stageTypeSchema.optional(),
});

export const reorderStagesSchema = z.object({
  stages: z
    .array(
      z.object({
        id: z.string().uuid(),
        order: z.number().int(),
      })
    )
    .min(1)
    .refine((items) => new Set(items.map((i) => i.id)).size === items.length, {
      message: "Duplicate stage ids",
    }),
});

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;
