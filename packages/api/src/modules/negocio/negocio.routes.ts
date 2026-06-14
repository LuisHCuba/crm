import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  list,
  getById,
  create,
  update,
  archive,
  restore,
  listLineItems,
  createLineItem,
  updateLineItem,
  deleteLineItem,
  linkContact,
  unlinkContact,
} from "./negocio.handlers";

export async function negocioRoutes(app: FastifyInstance) {
  const preHandler = [authenticate];

  app.get<{ Querystring: Record<string, unknown> }>("/negocios", { preHandler }, list);
  app.get<{ Params: { id: string } }>("/negocios/:id", { preHandler }, getById);
  app.post("/negocios", { preHandler }, create);
  app.patch<{ Params: { id: string } }>("/negocios/:id", { preHandler }, update);
  app.delete<{ Params: { id: string } }>("/negocios/:id", { preHandler }, archive);
  app.patch<{ Params: { id: string } }>("/negocios/:id/restore", { preHandler }, restore);

  app.get<{ Params: { id: string } }>("/negocios/:id/itens", { preHandler }, listLineItems);
  app.post<{ Params: { id: string } }>("/negocios/:id/itens", { preHandler }, createLineItem);
  app.patch<{ Params: { id: string; itemId: string } }>("/negocios/:id/itens/:itemId", { preHandler }, updateLineItem);
  app.delete<{ Params: { id: string; itemId: string } }>("/negocios/:id/itens/:itemId", { preHandler }, deleteLineItem);

  app.post<{ Params: { id: string } }>("/negocios/:id/contatos", { preHandler }, linkContact);
  app.delete<{ Params: { id: string; contactId: string } }>("/negocios/:id/contatos/:contactId", { preHandler }, unlinkContact);
}
