import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import { search } from "./busca.handlers";

export async function buscaRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.get("/busca", { preHandler }, search);
}
