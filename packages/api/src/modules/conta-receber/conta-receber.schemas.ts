import { z } from "zod";

const recurrenceType = z.enum([
  "none",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
]);

export const createContaReceberSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  companyId: z.string().uuid("ID de empresa inválido"),
  productId: z.string().uuid().nullable().optional(),
  value: z.string().min(1, "Valor obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento obrigatória"),
  categoryId: z.string().uuid().nullable().optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
  recurrence: recurrenceType.default("none"),
  recurrenceCount: z.coerce.number().int().min(2).optional(),
});

export const updateContaReceberSchema = z.object({
  description: z.string().min(1).optional(),
  companyId: z.string().uuid().optional(),
  productId: z.string().uuid().nullable().optional(),
  value: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
});

export const generateContaReceberSchema = z.object({
  dealId: z.string().uuid("ID de negócio inválido"),
  companyId: z.string().uuid("ID de empresa inválido"),
  items: z.array(z.object({
    productId: z.string().uuid().nullable().optional(),
    value: z.string().min(1, "Valor obrigatório"),
    parcels: z.coerce.number().int().min(1, "Mínimo 1 parcela"),
    firstDueDate: z.string().min(1, "Data obrigatória"),
    bankAccountId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
  })).min(1, "Pelo menos 1 item"),
});

export const receiveContaReceberSchema = z.object({
  paymentDate: z.string().min(1, "Data de pagamento obrigatória"),
  receivedValue: z.string().min(1, "Valor recebido obrigatório"),
  bankAccountId: z.string().uuid("Conta bancária obrigatória"),
});

export const listContasReceberQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
  companyId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
});

export type CreateContaReceberInput = z.infer<typeof createContaReceberSchema>;
export type UpdateContaReceberInput = z.infer<typeof updateContaReceberSchema>;
export type GenerateContaReceberInput = z.infer<typeof generateContaReceberSchema>;
export type ReceiveContaReceberInput = z.infer<typeof receiveContaReceberSchema>;
