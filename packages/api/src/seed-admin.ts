import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { count } from "drizzle-orm";
import { hash } from "bcrypt";
import postgres from "postgres";
import * as schema from "./db/schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

const [{ n }] = await db.select({ n: count() }).from(schema.users);

if (Number(n) === 0) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("Nenhum usuário existe, mas ADMIN_EMAIL/ADMIN_PASSWORD não configurados. Pulando criação do admin.");
  } else {
    const passwordHash = await hash(password, 10);
    await db.insert(schema.users).values({
      name: "Admin",
      email,
      passwordHash,
      role: "admin",
    });
    console.log(`Admin criado: ${email}`);
  }
} else {
  console.log("Usuários já existem, pulando seed do admin.");
}

const [{ p }] = await db.select({ p: count() }).from(schema.pipelines);

if (Number(p) === 0) {
  const [pipeline] = await db
    .insert(schema.pipelines)
    .values({ name: "Vendas", active: true })
    .returning();

  await db.insert(schema.pipelineStages).values([
    { pipelineId: pipeline.id, name: "Novo", order: 1, type: "open" },
    { pipelineId: pipeline.id, name: "Qualificado", order: 2, type: "open" },
    { pipelineId: pipeline.id, name: "Proposta enviada", order: 3, type: "open" },
    { pipelineId: pipeline.id, name: "Negociação", order: 4, type: "open" },
    { pipelineId: pipeline.id, name: "Ganho", order: 5, type: "won" },
    { pipelineId: pipeline.id, name: "Perdido", order: 6, type: "lost" },
  ]);
  console.log("Pipeline 'Vendas' criado com estágios.");
} else {
  console.log("Pipelines já existem, pulando seed.");
}

await client.end();
