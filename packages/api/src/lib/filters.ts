import { eq, ilike, and, gte, lte, SQL, or } from "drizzle-orm";

type FilterDef = {
  field: any;
  type: "eq" | "ilike" | "gte" | "lte";
  param: string;
};

export function buildFilters(
  query: Record<string, unknown>,
  definitions: FilterDef[]
): SQL[] {
  const conditions: SQL[] = [];

  for (const def of definitions) {
    const value = query[def.param];
    if (value === undefined || value === null || value === "") continue;

    switch (def.type) {
      case "eq":
        conditions.push(eq(def.field, String(value)));
        break;
      case "ilike":
        conditions.push(ilike(def.field, `%${String(value)}%`));
        break;
      case "gte":
        conditions.push(gte(def.field, String(value)));
        break;
      case "lte":
        conditions.push(lte(def.field, String(value)));
        break;
    }
  }

  return conditions;
}

export function searchFilter(fields: any[], query: string): SQL | undefined {
  if (!query || query.trim() === "") return undefined;
  const term = `%${query.trim()}%`;
  const conditions = fields.map((f) => ilike(f, term));
  return conditions.length === 1 ? conditions[0] : or(...conditions);
}
