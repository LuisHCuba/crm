import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  list,
  getById,
  create,
  update,
  archive,
  restore,
  addResponsible,
  removeResponsible,
  listStages,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
} from "./projeto.handlers";

export async function projetoRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.get<{ Querystring: Record<string, unknown> }>("/projetos", { preHandler }, list);
  app.post("/projetos", { preHandler }, create);
  app.get<{ Params: { id: string } }>("/projetos/:id", { preHandler }, getById);
  app.patch<{ Params: { id: string } }>("/projetos/:id", { preHandler }, update);
  app.delete<{ Params: { id: string } }>("/projetos/:id", { preHandler }, archive);
  app.patch<{ Params: { id: string } }>("/projetos/:id/restore", { preHandler }, restore);

  app.post<{ Params: { id: string }; Body: { userId: string } }>("/projetos/:id/responsaveis", { preHandler }, addResponsible);
  app.delete<{ Params: { id: string; userId: string } }>("/projetos/:id/responsaveis/:userId", { preHandler }, removeResponsible);

  app.get<{ Params: { id: string } }>("/projetos/:id/etapas", { preHandler }, listStages);
  app.post<{ Params: { id: string } }>("/projetos/:id/etapas", { preHandler }, createStage);
  app.patch<{ Params: { id: string; stageId: string } }>("/projetos/:id/etapas/:stageId", { preHandler }, updateStage);
  app.delete<{ Params: { id: string; stageId: string } }>("/projetos/:id/etapas/:stageId", { preHandler }, deleteStage);
  app.put<{ Params: { id: string } }>("/projetos/:id/etapas/reorder", { preHandler }, reorderStages);
}
