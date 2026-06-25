import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _client: postgres.Sql | null = null;

export function getDb() {
  if (_db) return _db;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing. Add it to .env.local");
  }

  _client = postgres(databaseUrl, {
    prepare: false,
    max: 1,
  });
  _db = drizzle(_client, { schema });
  return _db;
}
