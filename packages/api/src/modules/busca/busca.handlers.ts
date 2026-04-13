import { FastifyRequest, FastifyReply } from "fastify";
import { and, ilike, or } from "drizzle-orm";
import { db } from "../../db/connection";
import {
  companies,
  contacts,
  deals,
  products,
  projects,
  projectTasks,
  receivables,
  payables,
} from "../../db/schema";
import { notArchived } from "../../lib/soft-delete";

export async function search(
  request: FastifyRequest<{ Querystring: Record<string, unknown> }>,
  reply: FastifyReply
) {
  const q = String(request.query.q ?? "").trim();

  if (!q || q.length < 2) {
    return reply
      .status(400)
      .send({ error: "Validation", message: "Termo de busca deve ter ao menos 2 caracteres" });
  }

  const pattern = `%${q}%`;

  const [
    companiesResult,
    contactsResult,
    dealsResult,
    productsResult,
    projectsResult,
    tasksResult,
    receivablesResult,
    payablesResult,
  ] = await Promise.all([
    db
      .select({
        id: companies.id,
        legalName: companies.legalName,
        tradeName: companies.tradeName,
        document: companies.document,
      })
      .from(companies)
      .where(
        and(
          notArchived(companies),
          or(
            ilike(companies.legalName, pattern),
            ilike(companies.tradeName, pattern),
            ilike(companies.document, pattern)
          )
        )
      )
      .limit(5),

    db
      .select({
        id: contacts.id,
        fullName: contacts.fullName,
        email: contacts.email,
      })
      .from(contacts)
      .where(
        and(
          notArchived(contacts),
          or(
            ilike(contacts.fullName, pattern),
            ilike(contacts.email, pattern)
          )
        )
      )
      .limit(5),

    db
      .select({
        id: deals.id,
        title: deals.title,
      })
      .from(deals)
      .where(
        and(
          notArchived(deals),
          ilike(deals.title, pattern)
        )
      )
      .limit(5),

    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
      })
      .from(products)
      .where(
        and(
          notArchived(products),
          or(
            ilike(products.name, pattern),
            ilike(products.sku, pattern)
          )
        )
      )
      .limit(5),

    db
      .select({
        id: projects.id,
        title: projects.title,
      })
      .from(projects)
      .where(
        and(
          notArchived(projects),
          ilike(projects.title, pattern)
        )
      )
      .limit(5),

    db
      .select({
        id: projectTasks.id,
        title: projectTasks.title,
      })
      .from(projectTasks)
      .where(
        and(
          notArchived(projectTasks),
          ilike(projectTasks.title, pattern)
        )
      )
      .limit(5),

    db
      .select({
        id: receivables.id,
        description: receivables.description,
      })
      .from(receivables)
      .where(
        and(
          notArchived(receivables),
          ilike(receivables.description, pattern)
        )
      )
      .limit(5),

    db
      .select({
        id: payables.id,
        description: payables.description,
      })
      .from(payables)
      .where(
        and(
          notArchived(payables),
          ilike(payables.description, pattern)
        )
      )
      .limit(5),
  ]);

  return reply.send({
    companies: companiesResult.map((r) => ({
      id: r.id,
      label: r.tradeName || r.legalName,
      sublabel: r.document,
    })),
    contacts: contactsResult.map((r) => ({
      id: r.id,
      label: r.fullName,
      sublabel: r.email,
    })),
    deals: dealsResult.map((r) => ({
      id: r.id,
      label: r.title,
      sublabel: null,
    })),
    products: productsResult.map((r) => ({
      id: r.id,
      label: r.name,
      sublabel: r.sku,
    })),
    projects: projectsResult.map((r) => ({
      id: r.id,
      label: r.title,
      sublabel: null,
    })),
    tasks: tasksResult.map((r) => ({
      id: r.id,
      label: r.title,
      sublabel: "Tarefa de projeto",
    })),
    receivables: receivablesResult.map((r) => ({
      id: r.id,
      label: r.description,
      sublabel: null,
    })),
    payables: payablesResult.map((r) => ({
      id: r.id,
      label: r.description,
      sublabel: null,
    })),
  });
}
