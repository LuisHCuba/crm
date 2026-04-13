import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  list,
  getById,
  create,
  generate,
  update,
  archive,
  restore,
  receive,
  cancel,
} from "./conta-receber.handlers";

export async function contaReceberRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.get("/contas-receber", { preHandler }, list);
  app.post("/contas-receber", { preHandler }, create);
  app.post("/contas-receber/gerar", { preHandler }, generate);
  app.get("/contas-receber/:id", { preHandler }, getById);
  app.patch("/contas-receber/:id", { preHandler }, update);
  app.delete("/contas-receber/:id", { preHandler }, archive);
  app.patch("/contas-receber/:id/restore", { preHandler }, restore);
  app.patch("/contas-receber/:id/receber", { preHandler }, receive);
  app.patch("/contas-receber/:id/cancelar", { preHandler }, cancel);
}
