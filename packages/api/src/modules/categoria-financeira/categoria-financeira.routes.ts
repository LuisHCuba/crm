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
  app.get("/categorias-financeiras/:id", { preHandler }, getById);
  app.post("/categorias-financeiras", { preHandler }, create);
  app.patch("/categorias-financeiras/:id", { preHandler }, update);
  app.delete("/categorias-financeiras/:id", { preHandler }, archive);
  app.patch("/categorias-financeiras/:id/restore", { preHandler }, restore);
}
