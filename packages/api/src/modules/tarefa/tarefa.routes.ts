import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  list,
  listAll,
  myTasks,
  getById,
  createTask,
  updateTask,
  archiveTask,
  restoreTask,
  listSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from "./tarefa.handlers";

export async function tarefaRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.get("/projetos/tarefas", { preHandler }, listAll);
  app.get("/projetos/minhas-tarefas", { preHandler }, myTasks);

  app.get("/projetos/:projectId/tarefas", { preHandler }, list);
  app.post("/projetos/:projectId/tarefas", { preHandler }, createTask);
  app.get("/projetos/:projectId/tarefas/:taskId", { preHandler }, getById);
  app.patch("/projetos/:projectId/tarefas/:taskId", { preHandler }, updateTask);
  app.delete("/projetos/:projectId/tarefas/:taskId", { preHandler }, archiveTask);
  app.patch("/projetos/:projectId/tarefas/:taskId/restore", { preHandler }, restoreTask);

  app.get("/projetos/:projectId/tarefas/:taskId/subtarefas", { preHandler }, listSubtasks);
  app.post("/projetos/:projectId/tarefas/:taskId/subtarefas", { preHandler }, createSubtask);
  app.patch(
    "/projetos/:projectId/tarefas/:taskId/subtarefas/:subtaskId",
    { preHandler },
    updateSubtask
  );
  app.delete(
    "/projetos/:projectId/tarefas/:taskId/subtarefas/:subtaskId",
    { preHandler },
    deleteSubtask
  );
}
