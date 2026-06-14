import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  list,
  getById,
  create,
  update,
  archive,
  restore,
  getExtrato,
} from "./conta-bancaria.handlers";

export async function contaBancariaRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.get("/contas-bancarias", { preHandler }, list);
  app.get<{ Params: { id: string } }>("/contas-bancarias/:id", { preHandler }, getById);
  app.post("/contas-bancarias", { preHandler }, create);
  app.patch<{ Params: { id: string } }>("/contas-bancarias/:id", { preHandler }, update);
  app.delete<{ Params: { id: string } }>("/contas-bancarias/:id", { preHandler }, archive);
  app.patch<{ Params: { id: string } }>("/contas-bancarias/:id/restore", { preHandler }, restore);
  app.get<{ Params: { id: string }; Querystring: Record<string, unknown> }>("/contas-bancarias/:id/extrato", { preHandler }, getExtrato);
}
