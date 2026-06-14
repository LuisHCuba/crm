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

  app.get<{ Querystring: Record<string, unknown> }>("/projetos/tarefas", { preHandler }, listAll);
  app.get<{ Querystring: Record<string, unknown> }>("/projetos/minhas-tarefas", { preHandler }, myTasks);

  app.get<{ Params: { projectId: string }; Querystring: Record<string, unknown> }>("/projetos/:projectId/tarefas", { preHandler }, list);
  app.post<{ Params: { projectId: string } }>("/projetos/:projectId/tarefas", { preHandler }, createTask);
  app.get<{ Params: { projectId: string; taskId: string } }>("/projetos/:projectId/tarefas/:taskId", { preHandler }, getById);
  app.patch<{ Params: { projectId: string; taskId: string } }>("/projetos/:projectId/tarefas/:taskId", { preHandler }, updateTask);
  app.delete<{ Params: { projectId: string; taskId: string } }>("/projetos/:projectId/tarefas/:taskId", { preHandler }, archiveTask);
  app.patch<{ Params: { projectId: string; taskId: string } }>("/projetos/:projectId/tarefas/:taskId/restore", { preHandler }, restoreTask);

  app.get<{ Params: { projectId: string; taskId: string } }>("/projetos/:projectId/tarefas/:taskId/subtarefas", { preHandler }, listSubtasks);
  app.post<{ Params: { projectId: string; taskId: string } }>("/projetos/:projectId/tarefas/:taskId/subtarefas", { preHandler }, createSubtask);
  app.patch<{ Params: { projectId: string; taskId: string; subtaskId: string } }>(
    "/projetos/:projectId/tarefas/:taskId/subtarefas/:subtaskId",
    { preHandler },
    updateSubtask
  );
  app.delete<{ Params: { projectId: string; taskId: string; subtaskId: string } }>(
    "/projetos/:projectId/tarefas/:taskId/subtarefas/:subtaskId",
    { preHandler },
    deleteSubtask
  );
}
