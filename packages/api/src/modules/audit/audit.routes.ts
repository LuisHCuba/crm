import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import { list } from "./audit.handlers";

export async function auditRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.get<{ Querystring: Record<string, unknown> }>("/audit-log", { preHandler }, list);
}
