import { z } from "zod";

export const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  objectType: z.string().optional(),
  recordId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});
