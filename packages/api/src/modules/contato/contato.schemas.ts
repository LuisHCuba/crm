import { z } from "zod";

export const contactOriginZ = z.enum(["website", "referral", "event", "other"]);
export const contactStageZ = z.enum([
  "new",
  "qualified",
  "active_client",
  "inactive",
]);

export const createContactSchema = z.object({
  fullName: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  origin: contactOriginZ.optional().nullable(),
  stage: contactStageZ,
  responsibleId: z.string().uuid().optional().nullable(),
});

export const updateContactSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional().nullable(),
    jobTitle: z.string().optional().nullable(),
    origin: contactOriginZ.optional().nullable(),
    stage: contactStageZ.optional(),
    responsibleId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const linkCompanySchema = z.object({
  companyId: z.string().uuid("ID da empresa inválido"),
});

export const listContatosQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().max(100).optional(),
  stage: contactStageZ.optional(),
  companyId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const contatoIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const unlinkCompanyParamsSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
});

export const exportContatosQuerySchema = z.object({
  scope: z.enum(["all", "filtered"]).default("all"),
  stage: contactStageZ.optional(),
  companyId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const importConfirmRowSchema = z.object({
  data: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    jobTitle: z.string().optional().nullable(),
    origin: contactOriginZ.optional().nullable(),
    stage: contactStageZ.optional().nullable(),
  }),
  action: z.enum(["create", "update", "skip"]),
  existingId: z.string().uuid().optional().nullable(),
});

export const importConfirmBodySchema = z.object({
  rows: z.array(importConfirmRowSchema),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type LinkCompanyInput = z.infer<typeof linkCompanySchema>;
export type ListContatosQuery = z.infer<typeof listContatosQuerySchema>;
export type ExportContatosQuery = z.infer<typeof exportContatosQuerySchema>;
export type ImportConfirmBody = z.infer<typeof importConfirmBodySchema>;
