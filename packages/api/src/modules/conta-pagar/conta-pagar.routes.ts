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

  app.get("/contas-pagar", { preHandler }, list);
  app.post("/contas-pagar", { preHandler }, create);
  app.get("/contas-pagar/:id", { preHandler }, getById);
  app.patch("/contas-pagar/:id", { preHandler }, update);
  app.delete("/contas-pagar/:id", { preHandler }, archive);
  app.patch("/contas-pagar/:id/restore", { preHandler }, restore);
  app.patch("/contas-pagar/:id/pagar", { preHandler }, pay);
  app.patch("/contas-pagar/:id/cancelar", { preHandler }, cancel);
}
