import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

console.log("Executando migrações...");

await migrate(db, { migrationsFolder: "./src/db/migrations" });

console.log("Migrações concluídas.");

await client.end();
