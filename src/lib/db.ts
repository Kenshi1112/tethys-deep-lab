import { Pool } from "pg";

// One pool per server process (kept on globalThis so dev hot-reload does not open many pools).
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg.pgPool) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForPg.pgPool = new Pool({ connectionString: url, max: 5 });
  }
  return globalForPg.pgPool;
}
