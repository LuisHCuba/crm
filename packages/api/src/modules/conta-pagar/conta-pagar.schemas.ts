import { z } from "zod";

const recurrenceType = z.enum([
  "none",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
]);

export const createContaPagarSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  companyId: z.string().uuid().nullable().optional(),
  value: z.string().min(1, "Valor obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento obrigatória"),
  categoryId: z.string().uuid().nullable().optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
  recurrence: recurrenceType.default("none"),
  recurrenceCount: z.coerce.number().int().min(2).optional(),
});

export const updateContaPagarSchema = z.object({
  description: z.string().min(1).optional(),
  companyId: z.string().uuid().nullable().optional(),
  value: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
});

export const payContaPagarSchema = z.object({
  paymentDate: z.string().min(1, "Data de pagamento obrigatória"),
  paidValue: z.string().min(1, "Valor pago obrigatório"),
  bankAccountId: z.string().uuid("Conta bancária obrigatória"),
});

export const listContasPagarQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
  companyId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
});

export type CreateContaPagarInput = z.infer<typeof createContaPagarSchema>;
export type UpdateContaPagarInput = z.infer<typeof updateContaPagarSchema>;
export type PayContaPagarInput = z.infer<typeof payContaPagarSchema>;
