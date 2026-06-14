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

  app.get<{ Querystring: Record<string, unknown> }>("/contas-receber", { preHandler }, list);
  app.post("/contas-receber", { preHandler }, create);
  app.post("/contas-receber/gerar", { preHandler }, generate);
  app.get<{ Params: { id: string } }>("/contas-receber/:id", { preHandler }, getById);
  app.patch<{ Params: { id: string } }>("/contas-receber/:id", { preHandler }, update);
  app.delete<{ Params: { id: string } }>("/contas-receber/:id", { preHandler }, archive);
  app.patch<{ Params: { id: string } }>("/contas-receber/:id/restore", { preHandler }, restore);
  app.patch<{ Params: { id: string } }>("/contas-receber/:id/receber", { preHandler }, receive);
  app.patch<{ Params: { id: string } }>("/contas-receber/:id/cancelar", { preHandler }, cancel);
}
