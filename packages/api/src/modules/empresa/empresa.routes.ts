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

  app.get<{ Querystring: Record<string, unknown> }>("/empresas", { preHandler }, list);
  app.get<{ Params: { id: string } }>("/empresas/:id", { preHandler }, getById);
  app.post("/empresas", { preHandler }, create);
  app.patch<{ Params: { id: string } }>("/empresas/:id", { preHandler }, update);
  app.delete<{ Params: { id: string } }>("/empresas/:id", { preHandler }, archive);
  app.patch<{ Params: { id: string } }>("/empresas/:id/restore", { preHandler }, restore);
}
