import { z } from "zod";

const companyType = z.enum(["client", "supplier", "both"]);

export const createEmpresaSchema = z.object({
  legalName: z.string().min(1, "Razão social obrigatória"),
  tradeName: z.string().nullable().optional(),
  document: z.string().min(1, "Documento obrigatório"),
  phone: z.string().nullable().optional(),
  email: z.string().email("E-mail inválido").nullable().optional(),
  address: z.string().nullable().optional(),
  type: companyType,
  responsibleId: z.string().uuid().nullable().optional(),
});

export const updateEmpresaSchema = z.object({
  legalName: z.string().min(1).optional(),
  tradeName: z.string().nullable().optional(),
  document: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email("E-mail inválido").nullable().optional(),
  address: z.string().nullable().optional(),
  type: companyType.optional(),
  responsibleId: z.string().uuid().nullable().optional(),
});

export const listEmpresasQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  type: z.enum(["client", "supplier", "both"]).optional(),
  responsibleId: z.string().uuid().optional(),
  search: z.string().optional(),
  includeArchived: z.string().optional(),
});

export type CreateEmpresaInput = z.infer<typeof createEmpresaSchema>;
export type UpdateEmpresaInput = z.infer<typeof updateEmpresaSchema>;
