import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import { list, getById, create, update, archive, restore } from "./produto.handlers";

const auth = { preHandler: [authenticate] };

export async function produtoRoutes(app: FastifyInstance) {
  app.get("/produtos", { ...auth }, list);
  app.get("/produtos/:id", { ...auth }, getById);
  app.post("/produtos", { ...auth }, create);
  app.patch("/produtos/:id", { ...auth }, update);
  app.delete("/produtos/:id", { ...auth }, archive);
  app.patch("/produtos/:id/restore", { ...auth }, restore);
}
