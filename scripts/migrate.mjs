// Applique les migrations SQL de database/migrations dans l'ordre, une seule fois chacune.
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const dir = new URL("../database/migrations/", import.meta.url);
const client = await pool.connect();
try {
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    const sql = await readFile(new URL(file, dir), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("RESET search_path"); // une migration peut changer de schéma
      await client.query("INSERT INTO public.schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log("appliquée :", file);
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(`${file} : ${e.message}`);
    }
  }
  console.log("migrations à jour");
} finally {
  client.release();
  await pool.end();
}
