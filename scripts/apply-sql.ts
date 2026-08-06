/**
 * Apply SQL migration file using DATABASE_URL from .env.local
 *   npx tsx --env-file=.env.local scripts/apply-sql.ts supabase/migrations/....sql
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error(
      "Usage: tsx --env-file=.env.local scripts/apply-sql.ts <file.sql>"
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  const sql = fs.readFileSync(path.resolve(file), "utf8");
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log("OK:", file);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
