import { z } from "zod";

const linkedIds = {
  linkedCompanyId: z.string().uuid().optional(),
  linkedContactId: z.string().uuid().optional(),
  linkedDealId: z.string().uuid().optional(),
  linkedProjectId: z.string().uuid().optional(),
  linkedTaskId: z.string().uuid().optional(),
};

const baseActivity = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  ...linkedIds,
});

const reminderSchema = baseActivity.extend({
  type: z.literal("reminder"),
  reminderDueDate: z.string().min(1, "Data de vencimento obrigatória"),
  reminderResponsibleId: z.string().uuid().optional(),
});

const noteSchema = baseActivity.extend({
  type: z.literal("note"),
});

const callSchema = baseActivity.extend({
  type: z.literal("call"),
  callDurationMinutes: z.number().int().min(0).optional(),
  callResult: z.enum(["answered", "no_answer", "voicemail"]).optional(),
});

const meetingSchema = baseActivity.extend({
  type: z.literal("meeting"),
  meetingDate: z.string().optional(),
  meetingParticipants: z.string().optional(),
});

const emailSchema = baseActivity.extend({
  type: z.literal("email"),
  emailSubject: z.string().optional(),
});

export const createActivitySchema = z
  .discriminatedUnion("type", [
    reminderSchema,
    noteSchema,
    callSchema,
    meetingSchema,
    emailSchema,
  ])
  .refine(
    (data) =>
      data.linkedCompanyId ||
      data.linkedContactId ||
      data.linkedDealId ||
      data.linkedProjectId ||
      data.linkedTaskId,
    { message: "Informe ao menos um registro vinculado" }
  );

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
