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

  app.get("/negocios", { preHandler }, list);
  app.get("/negocios/:id", { preHandler }, getById);
  app.post("/negocios", { preHandler }, create);
  app.patch("/negocios/:id", { preHandler }, update);
  app.delete("/negocios/:id", { preHandler }, archive);
  app.patch("/negocios/:id/restore", { preHandler }, restore);

  app.get("/negocios/:id/itens", { preHandler }, listLineItems);
  app.post("/negocios/:id/itens", { preHandler }, createLineItem);
  app.patch("/negocios/:id/itens/:itemId", { preHandler }, updateLineItem);
  app.delete("/negocios/:id/itens/:itemId", { preHandler }, deleteLineItem);

  app.post("/negocios/:id/contatos", { preHandler }, linkContact);
  app.delete("/negocios/:id/contatos/:contactId", { preHandler }, unlinkContact);
}
