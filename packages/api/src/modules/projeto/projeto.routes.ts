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

  app.get("/projetos", { preHandler }, list);
  app.post("/projetos", { preHandler }, create);
  app.get("/projetos/:id", { preHandler }, getById);
  app.patch("/projetos/:id", { preHandler }, update);
  app.delete("/projetos/:id", { preHandler }, archive);
  app.patch("/projetos/:id/restore", { preHandler }, restore);

  app.post("/projetos/:id/responsaveis", { preHandler }, addResponsible);
  app.delete("/projetos/:id/responsaveis/:userId", { preHandler }, removeResponsible);

  app.get("/projetos/:id/etapas", { preHandler }, listStages);
  app.post("/projetos/:id/etapas", { preHandler }, createStage);
  app.patch("/projetos/:id/etapas/:stageId", { preHandler }, updateStage);
  app.delete("/projetos/:id/etapas/:stageId", { preHandler }, deleteStage);
  app.put("/projetos/:id/etapas/reorder", { preHandler }, reorderStages);
}
