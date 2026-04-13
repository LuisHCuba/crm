import { z } from "zod";

export const createContaBancariaSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  bankName: z.string().nullable().optional(),
  branchAccount: z.string().nullable().optional(),
  initialBalance: z.string().min(1, "Saldo inicial obrigatório"),
  active: z.boolean().default(true),
});

export const updateContaBancariaSchema = z.object({
  name: z.string().min(1).optional(),
  bankName: z.string().nullable().optional(),
  branchAccount: z.string().nullable().optional(),
  initialBalance: z.string().optional(),
  active: z.boolean().optional(),
});

export const extratoQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(25),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type CreateContaBancariaInput = z.infer<typeof createContaBancariaSchema>;
export type UpdateContaBancariaInput = z.infer<typeof updateContaBancariaSchema>;
