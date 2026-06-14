import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  list,
  getById,
  create,
  update,
  archive,
  restore,
  pay,
  cancel,
} from "./conta-pagar.handlers";

export async function contaPagarRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.get<{ Querystring: Record<string, unknown> }>("/contas-pagar", { preHandler }, list);
  app.post("/contas-pagar", { preHandler }, create);
  app.get<{ Params: { id: string } }>("/contas-pagar/:id", { preHandler }, getById);
  app.patch<{ Params: { id: string } }>("/contas-pagar/:id", { preHandler }, update);
  app.delete<{ Params: { id: string } }>("/contas-pagar/:id", { preHandler }, archive);
  app.patch<{ Params: { id: string } }>("/contas-pagar/:id/restore", { preHandler }, restore);
  app.patch<{ Params: { id: string } }>("/contas-pagar/:id/pagar", { preHandler }, pay);
  app.patch<{ Params: { id: string } }>("/contas-pagar/:id/cancelar", { preHandler }, cancel);
}
