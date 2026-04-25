import { readFileSync } from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import Database from "better-sqlite3";

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

const migrationsDir = path.resolve(process.cwd(), "prisma/migrations");

export const migrations: Migration[] = globSync("*/migration.sql", {
  cwd: migrationsDir,
})
  .sort()
  .map((file, index) => {
    const dirName = path.dirname(file);
    const name = dirName.replace(/^\d+_/, "");
    const sql = readFileSync(path.join(migrationsDir, file), "utf-8");
    return { version: index + 1, name, sql };
  });

export function runMigrations(dbPath: string): void {
  const db = new Database(dbPath);

  try {
    db.pragma("journal_mode = WAL");

    db.exec(`
      CREATE TABLE IF NOT EXISTS _schema_version (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    const currentVersion =
      (
        db.prepare("SELECT MAX(version) as v FROM _schema_version").get() as {
          v: number | null;
        }
      )?.v ?? 0;

    // Handle databases created by the old Prisma-managed migration system:
    // tables exist but _schema_version is empty. Mark existing migrations
    // as applied so we don't try to re-create tables.
    if (currentVersion === 0) {
      const existingTable = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='RecipeVisibility'",
        )
        .get() as { name: string } | undefined;

      if (existingTable) {
        // Only mark migration 1 (init) as applied — its tables already exist.
        // Any migrations beyond version 1 need to be applied normally.
        const initMigration = migrations.find((m) => m.version === 1);
        if (initMigration) {
          db.prepare(
            "INSERT INTO _schema_version (version, name) VALUES (?, ?)",
          ).run(initMigration.version, initMigration.name);
        }
        console.log(
          "Detected pre-existing database. Marked init migration as applied.",
        );
        // Do NOT return — fall through so pending migrations (v2+) are applied
      }
    }

    const pending = migrations.filter((m) => m.version > currentVersion);

    if (pending.length === 0) {
      return;
    }

    // Validate no gaps or duplicates
    const versions = migrations.map((m) => m.version);
    const sorted = [...versions].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) {
        throw new Error(
          `Migration versions must be sequential starting from 1. ` +
            `Expected version ${i + 1} but found ${sorted[i]}.`,
        );
      }
    }

    for (const migration of pending) {
      db.transaction(() => {
        db.exec(migration.sql);
        db.prepare(
          "INSERT INTO _schema_version (version, name) VALUES (?, ?)",
        ).run(migration.version, migration.name);
      })();
    }

    console.log(
      `Applied ${pending.length} migration(s), now at version ${pending[pending.length - 1]!.version}.`,
    );
  } finally {
    db.close();
  }
}
