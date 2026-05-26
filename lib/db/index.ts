import "server-only";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurada. Defina no arquivo .env.local.");
  }

  return databaseUrl;
}

type DrizzleClient = ReturnType<typeof drizzle>;

let dbInstance: DrizzleClient | null = null;

export function getDb(): DrizzleClient {
  if (dbInstance) {
    return dbInstance;
  }

  const queryClient = postgres(getDatabaseUrl(), { prepare: false, max: 1 });
  dbInstance = drizzle(queryClient, { schema });

  return dbInstance;
}

export async function runConnectionTest() {
  const db = getDb();
  return db.execute(sql`select 1 as ok`);
}
