import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import path from "node:path";

type Row = Record<string, any>;
type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let runner: Promise<Query> | null = null;

async function makeRunner(): Promise<Query> {
  if (url) {
    const sql = neon(url);
    return (text, params = []) => sql.query(text, params as any[]) as Promise<Row[]>;
  }
  // Local development without a database: an in-process Postgres (PGlite),
  // stored in .pglite/ so data survives restarts.
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(process.env.PGLITE_DIR ?? path.join(process.cwd(), ".pglite"));
  await db.exec(readFileSync(path.join(process.cwd(), "db/schema.sql"), "utf8"));
  return async (text, params = []) => (await db.query<Row>(text, params as any[])).rows;
}

export async function q<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  runner ??= makeRunner();
  return (await runner)(text, params) as Promise<T[]>;
}

export async function migrate() {
  const schema = readFileSync(path.join(process.cwd(), "db/schema.sql"), "utf8");
  for (const stmt of schema.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    await q(stmt);
  }
}
