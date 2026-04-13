import { z } from "zod";

const dealLossReason = z.enum(["price", "competition", "timing", "no_response", "other"]);

/** Sem empresa: omitir a chave ou `undefined` (ver `normalizeCreateDealBody`). Não usar `null` no JSON. */
const createCompanyId = z.string().uuid().optional();

/** Atualização pode limpar empresa com `null`. */
const updateCompanyId = z.union([z.string().uuid(), z.null()]).optional();

export const createDealSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  companyId: createCompanyId,
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  forecastDate: z.string().nullable().optional(),
  responsibleId: z.string().uuid(),
  /** JSON pode trazer `null` em posições do array (ex.: `undefined` serializado). */
  contactIds: z.preprocess(
    (val) =>
      Array.isArray(val)
        ? val.filter((x): x is string => typeof x === "string" && x.length > 0)
        : val,
    z.array(z.string().uuid()).optional(),
  ),
});

export const updateDealSchema = z.object({
  title: z.string().min(1).optional(),
  companyId: updateCompanyId,
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  forecastDate: z.string().nullable().optional(),
  responsibleId: z.string().uuid().optional(),
  lossReason: dealLossReason.nullable().optional(),
});

export const createLineItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, "Quantidade mínima é 1"),
  unitPrice: z.coerce.string().min(1, "Preço unitário obrigatório"),
  discountPercent: z.coerce.string().default("0"),
});

export const updateLineItemSchema = z.object({
  productId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  unitPrice: z.coerce.string().optional(),
  discountPercent: z.coerce.string().optional(),
});

export const linkContactSchema = z.object({
  contactId: z.string().uuid(),
});

export const listNegociosQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  search: z.string().optional(),
  groupByStage: z.enum(["true", "false"]).optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type CreateLineItemInput = z.infer<typeof createLineItemSchema>;
export type UpdateLineItemInput = z.infer<typeof updateLineItemSchema>;
