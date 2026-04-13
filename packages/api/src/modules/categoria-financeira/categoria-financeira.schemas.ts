import { z } from "zod";

const categoryType = z.enum(["revenue", "expense"]);

export const createCategoriaFinanceiraSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  type: categoryType,
  active: z.boolean().default(true),
});

export const updateCategoriaFinanceiraSchema = z.object({
  name: z.string().min(1).optional(),
  type: categoryType.optional(),
  active: z.boolean().optional(),
});

export type CreateCategoriaFinanceiraInput = z.infer<typeof createCategoriaFinanceiraSchema>;
export type UpdateCategoriaFinanceiraInput = z.infer<typeof updateCategoriaFinanceiraSchema>;
