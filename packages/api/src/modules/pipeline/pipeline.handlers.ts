import { FastifyRequest, FastifyReply } from "fastify";
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../db/connection";
import { pipelineStages, pipelines } from "../../db/schema";
import { logAudit, logChanges } from "../../lib/audit";
import { handleError } from "../../lib/errors";
import { archiveRecord, restoreRecord } from "../../lib/soft-delete";
import {
  createPipelineSchema,
  updatePipelineSchema,
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema,
} from "./pipeline.schemas";

function userId(request: FastifyRequest): string {
  return (request.user as { id: string }).id;
}

export async function list(_request: FastifyRequest, _reply: FastifyReply) {
  try {
    const rows = await db.select().from(pipelines);
    const counts = await db
      .select({
        pipelineId: pipelineStages.pipelineId,
        n: count(),
      })
      .from(pipelineStages)
      .groupBy(pipelineStages.pipelineId);

    const countMap = new Map(
      counts.map((c) => [c.pipelineId, Number(c.n)] as const)
    );

    return rows.map((p) => ({
      ...p,
      stageCount: countMap.get(p.id) ?? 0,
    }));
  } catch (err) {
    return handleError(_reply, err);
  }
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const [pipeline] = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1);

    if (!pipeline) {
      return reply.status(404).send({ error: "NotFound", message: "Pipeline não encontrado" });
    }

    const stages = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, id))
      .orderBy(asc(pipelineStages.order));

    return { ...pipeline, stages };
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  try {
    const parsed = createPipelineSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [row] = await db
      .insert(pipelines)
      .values({ name: parsed.data.name, active: parsed.data.active })
      .returning();

    await logAudit({
      userId: userId(request),
      objectType: "pipeline",
      recordId: row.id,
      action: "created",
    });

    return reply.status(201).send(row);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const parsed = updatePipelineSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [existing] = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NotFound", message: "Pipeline não encontrado" });
    }

    const patch = parsed.data;
    const keys = Object.keys(patch) as (keyof typeof patch)[];
    if (keys.length === 0) {
      return existing;
    }

    const [updated] = await db
      .update(pipelines)
      .set(patch)
      .where(eq(pipelines.id, id))
      .returning();

    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};
    for (const k of keys) {
      const v = patch[k];
      if (v !== undefined) {
        oldData[k] = existing[k];
        newData[k] = v;
      }
    }

    await logChanges({
      userId: userId(request),
      objectType: "pipeline",
      recordId: id,
      oldData,
      newData,
    });

    return updated;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function archive(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NotFound", message: "Pipeline não encontrado" });
    }

    await archiveRecord(pipelines, id, userId(request), "pipeline");
    return reply.status(204).send();
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function restore(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NotFound", message: "Pipeline não encontrado" });
    }

    await restoreRecord(pipelines, id, userId(request), "pipeline");

    const [row] = await db.select().from(pipelines).where(eq(pipelines.id, id)).limit(1);
    return row;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function listStages(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };

    const [pipeline] = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1);

    if (!pipeline) {
      return reply.status(404).send({ error: "NotFound", message: "Pipeline não encontrado" });
    }

    return db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, id))
      .orderBy(asc(pipelineStages.order));
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function createStage(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: pipelineId } = request.params as { id: string };
    const parsed = createStageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [pipeline] = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.id, pipelineId))
      .limit(1);

    if (!pipeline) {
      return reply.status(404).send({ error: "NotFound", message: "Pipeline não encontrado" });
    }

    const [row] = await db
      .insert(pipelineStages)
      .values({
        pipelineId,
        name: parsed.data.name,
        order: parsed.data.order,
        type: parsed.data.type,
      })
      .returning();

    await logAudit({
      userId: userId(request),
      objectType: "pipeline_stage",
      recordId: row.id,
      action: "created",
    });

    return reply.status(201).send(row);
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function updateStage(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: pipelineId, stageId } = request.params as { id: string; stageId: string };
    const parsed = updateStageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [existing] = await db
      .select()
      .from(pipelineStages)
      .where(
        and(eq(pipelineStages.id, stageId), eq(pipelineStages.pipelineId, pipelineId))
      )
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "NotFound", message: "Estágio não encontrado" });
    }

    const patch = parsed.data;
    const keys = Object.keys(patch) as (keyof typeof patch)[];
    if (keys.length === 0) {
      return reply.status(400).send({ error: "Validation", message: "Nenhum campo para atualizar" });
    }

    const [updated] = await db
      .update(pipelineStages)
      .set(patch)
      .where(eq(pipelineStages.id, stageId))
      .returning();

    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};
    for (const k of keys) {
      const v = patch[k];
      if (v !== undefined) {
        oldData[k] = existing[k];
        newData[k] = v;
      }
    }

    await logChanges({
      userId: userId(request),
      objectType: "pipeline_stage",
      recordId: stageId,
      oldData,
      newData,
    });

    return updated;
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function deleteStage(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: pipelineId, stageId } = request.params as { id: string; stageId: string };

    const deleted = await db
      .delete(pipelineStages)
      .where(
        and(eq(pipelineStages.id, stageId), eq(pipelineStages.pipelineId, pipelineId))
      )
      .returning({ id: pipelineStages.id });

    if (deleted.length === 0) {
      return reply.status(404).send({ error: "NotFound", message: "Estágio não encontrado" });
    }

    await logAudit({
      userId: userId(request),
      objectType: "pipeline_stage",
      recordId: stageId,
      action: "archived",
    });

    return reply.status(204).send();
  } catch (err) {
    return handleError(reply, err);
  }
}

export async function reorderStages(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: pipelineId } = request.params as { id: string };
    const parsed = reorderStagesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
    }

    const [pipeline] = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.id, pipelineId))
      .limit(1);

    if (!pipeline) {
      return reply.status(404).send({ error: "NotFound", message: "Pipeline não encontrado" });
    }

    const dbStages = await db
      .select({ id: pipelineStages.id })
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipelineId));

    const dbIds = new Set(dbStages.map((s) => s.id));
    const incomingIds = new Set(parsed.data.stages.map((s) => s.id));

    if (dbIds.size !== incomingIds.size) {
      return reply.status(400).send({
        error: "Validation",
        message: "A lista de estágios deve conter exatamente todos os estágios do pipeline",
      });
    }

    for (const sid of dbIds) {
      if (!incomingIds.has(sid)) {
        return reply.status(400).send({
          error: "Validation",
          message: "A lista de estágios deve conter exatamente todos os estágios do pipeline",
        });
      }
    }

    await db.transaction(async (tx) => {
      for (const row of parsed.data.stages) {
        await tx
          .update(pipelineStages)
          .set({ order: row.order })
          .where(
            and(eq(pipelineStages.id, row.id), eq(pipelineStages.pipelineId, pipelineId))
          );
      }
    });

    return db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipelineId))
      .orderBy(asc(pipelineStages.order));
  } catch (err) {
    return handleError(reply, err);
  }
}
