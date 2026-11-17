// Run a .sql file against DATABASE_URL.  Usage: node scripts/run-sql.mjs db/schema.sql
import fs from "node:fs";
import pg from "pg";

const file = process.argv[2];
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!file || !url) {
  console.error("Usage: DATABASE_URL=... node scripts/run-sql.mjs <file.sql>");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(fs.readFileSync(file, "utf8"));
await client.end();
console.log("OK:", file);
