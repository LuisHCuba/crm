import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  create,
  listByRecord,
  listReminders,
  completeReminder,
} from "./atividade.handlers";

export async function atividadeRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.post("/atividades", { preHandler }, create);
  app.get<{ Querystring: Record<string, unknown> }>("/atividades", { preHandler }, listByRecord);
  app.get<{ Querystring: Record<string, unknown> }>("/lembretes", { preHandler }, listReminders);
  app.patch<{ Params: { id: string } }>("/lembretes/:id/concluir", { preHandler }, completeReminder);
}
