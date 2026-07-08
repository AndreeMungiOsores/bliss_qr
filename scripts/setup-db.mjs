import { mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databaseUrl = process.env.DATABASE_URL ?? readDatabaseUrlFromEnv() ?? "file:./dev.db";
const databasePath = resolveSqlitePath(databaseUrl);
const migrationPath = resolve("prisma/migrations/20260708111500_init/migration.sql");
const sql = readFileSync(migrationPath, "utf8");

mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(sql);
db.close();

console.log(`SQLite database ready at ${databasePath}`);

function readDatabaseUrlFromEnv() {
  try {
    const env = readFileSync(".env", "utf8");
    const match = env.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function resolveSqlitePath(url) {
  if (!url.startsWith("file:")) {
    throw new Error("db:setup only supports SQLite DATABASE_URL values that start with file:.");
  }

  const filePath = url.slice("file:".length);

  if (isAbsolute(filePath)) {
    return filePath;
  }

  return resolve("prisma", filePath);
}
