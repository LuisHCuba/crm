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
  app.get("/contas-bancarias/:id", { preHandler }, getById);
  app.post("/contas-bancarias", { preHandler }, create);
  app.patch("/contas-bancarias/:id", { preHandler }, update);
  app.delete("/contas-bancarias/:id", { preHandler }, archive);
  app.patch("/contas-bancarias/:id/restore", { preHandler }, restore);
  app.get("/contas-bancarias/:id/extrato", { preHandler }, getExtrato);
}
