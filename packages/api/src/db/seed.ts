import "dotenv/config";
import { count } from "drizzle-orm";
import { db } from "./connection";
import { pipelineStages, pipelines } from "./schema";

async function seed() {
  const [{ n }] = await db.select({ n: count() }).from(pipelines);
  if (Number(n) > 0) {
    return;
  }

  const [pipeline] = await db
    .insert(pipelines)
    .values({ name: "Vendas", active: true })
    .returning();

  await db.insert(pipelineStages).values([
    { pipelineId: pipeline.id, name: "Novo", order: 1, type: "open" },
    { pipelineId: pipeline.id, name: "Qualificado", order: 2, type: "open" },
    {
      pipelineId: pipeline.id,
      name: "Proposta enviada",
      order: 3,
      type: "open",
    },
    { pipelineId: pipeline.id, name: "Negociação", order: 4, type: "open" },
    { pipelineId: pipeline.id, name: "Ganho", order: 5, type: "won" },
    { pipelineId: pipeline.id, name: "Perdido", order: 6, type: "lost" },
  ]);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
