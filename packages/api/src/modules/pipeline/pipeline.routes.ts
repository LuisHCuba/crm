import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  list,
  getById,
  create,
  update,
  archive,
  restore,
  listStages,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
} from "./pipeline.handlers";

const auth = { preHandler: [authenticate] };

export async function pipelineRoutes(app: FastifyInstance) {
  app.get("/pipelines", { ...auth }, list);
  app.post("/pipelines", { ...auth }, create);
  app.get("/pipelines/:id", { ...auth }, getById);
  app.patch("/pipelines/:id", { ...auth }, update);
  app.delete("/pipelines/:id", { ...auth }, archive);
  app.patch("/pipelines/:id/restore", { ...auth }, restore);
  app.get("/pipelines/:id/stages", { ...auth }, listStages);
  app.post("/pipelines/:id/stages", { ...auth }, createStage);
  app.patch("/pipelines/:id/stages/reorder", { ...auth }, reorderStages);
  app.patch("/pipelines/:id/stages/:stageId", { ...auth }, updateStage);
  app.delete("/pipelines/:id/stages/:stageId", { ...auth }, deleteStage);
}
