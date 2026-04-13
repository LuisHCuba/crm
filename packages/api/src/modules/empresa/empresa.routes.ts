import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  list,
  getById,
  create,
  update,
  archive,
  restore,
} from "./empresa.handlers";

export async function empresaRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.get("/empresas", { preHandler }, list);
  app.get("/empresas/:id", { preHandler }, getById);
  app.post("/empresas", { preHandler }, create);
  app.patch("/empresas/:id", { preHandler }, update);
  app.delete("/empresas/:id", { preHandler }, archive);
  app.patch("/empresas/:id/restore", { preHandler }, restore);
}
