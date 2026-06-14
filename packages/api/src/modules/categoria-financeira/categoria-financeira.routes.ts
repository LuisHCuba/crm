import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  list,
  getById,
  create,
  update,
  archive,
  restore,
} from "./categoria-financeira.handlers";

export async function categoriaFinanceiraRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.get("/categorias-financeiras", { preHandler }, list);
  app.get<{ Params: { id: string } }>("/categorias-financeiras/:id", { preHandler }, getById);
  app.post("/categorias-financeiras", { preHandler }, create);
  app.patch<{ Params: { id: string } }>("/categorias-financeiras/:id", { preHandler }, update);
  app.delete<{ Params: { id: string } }>("/categorias-financeiras/:id", { preHandler }, archive);
  app.patch<{ Params: { id: string } }>("/categorias-financeiras/:id/restore", { preHandler }, restore);
}
