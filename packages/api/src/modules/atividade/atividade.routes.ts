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
  app.get("/atividades", { preHandler }, listByRecord);
  app.get("/lembretes", { preHandler }, listReminders);
  app.patch("/lembretes/:id/concluir", { preHandler }, completeReminder);
}
