import { z } from "zod";

const decimalString = z
  .string()
  .min(1)
  .regex(/^\d+(\.\d+)?$/, "Preço base deve ser um decimal válido");

const skuField = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.string().min(1).optional()
);

export const produtoCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  sku: skuField,
  description: z.string().nullable().optional(),
  basePrice: decimalString,
  unit: z.string().min(1, "Unidade é obrigatória"),
  active: z.boolean().optional().default(true),
});

export const produtoUpdateSchema = produtoCreateSchema.partial();

export const listProdutosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  active: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  includeArchived: z.string().optional(),
});

export const produtoIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ProdutoCreateInput = z.infer<typeof produtoCreateSchema>;
export type ProdutoUpdateInput = z.infer<typeof produtoUpdateSchema>;
export type ListProdutosQuery = z.infer<typeof listProdutosQuerySchema>;
