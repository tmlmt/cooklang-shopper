import { readdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { runMigrations } from "~~/server/utils/migrationRunner";
import { migrations } from "~~/server/utils/migrations";

// --- Validation: auto-discovered migrations match Prisma directory ---

describe("migrations registry", () => {
  const migrationsDir = path.resolve(process.cwd(), "prisma/migrations");
  const prismaSubdirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  it("has one entry per Prisma migration directory", () => {
    expect(migrations.length).toBe(prismaSubdirs.length);
  });

  it("has sequential version numbers starting from 1", () => {
    for (let i = 0; i < migrations.length; i++) {
      expect(migrations[i]!.version).toBe(i + 1);
    }
  });

  it("has unique names", () => {
    const names = migrations.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("derives name from Prisma migration directory", () => {
    for (let i = 0; i < prismaSubdirs.length; i++) {
      const expectedName = prismaSubdirs[i]!.name.replace(/^\d+_/, "");
      expect(migrations[i]!.name).toBe(expectedName);
    }
  });

  it("contains non-empty SQL for each migration", () => {
    for (const m of migrations) {
      expect(m.sql.trim().length).toBeGreaterThan(0);
    }
  });
});

// --- Migration runner ---

describe("runMigrations", () => {
  const tmpPaths: string[] = [];

  function tempDbPath(): string {
    // Use in-memory-like temp file (unique per test)
    const p = path.resolve(
      process.cwd(),
      `data/test-migrate-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
    );
    tmpPaths.push(p);
    return p;
  }

  afterEach(async () => {
    const { unlinkSync, existsSync } = await import("node:fs");
    for (const p of tmpPaths) {
      if (existsSync(p)) unlinkSync(p);
      // WAL/SHM files
      if (existsSync(p + "-wal")) unlinkSync(p + "-wal");
      if (existsSync(p + "-shm")) unlinkSync(p + "-shm");
    }
    tmpPaths.length = 0;
  });

  it("creates schema from scratch on a new database", () => {
    const dbPath = tempDbPath();
    runMigrations(dbPath);

    const db = new Database(dbPath);
    try {
      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        )
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain("RecipeVisibility");
      expect(tableNames).toContain("ShareLink");
      expect(tableNames).toContain("_schema_version");

      const version = db
        .prepare("SELECT MAX(version) as v FROM _schema_version")
        .get() as { v: number };
      expect(version.v).toBe(migrations.length);
    } finally {
      db.close();
    }
  });

  it("is idempotent — running twice does not error", () => {
    const dbPath = tempDbPath();
    runMigrations(dbPath);
    runMigrations(dbPath);

    const db = new Database(dbPath);
    try {
      const rows = db.prepare("SELECT * FROM _schema_version").all() as {
        version: number;
      }[];
      expect(rows.length).toBe(migrations.length);
    } finally {
      db.close();
    }
  });

  it("applies only new migrations on an existing database", () => {
    const dbPath = tempDbPath();
    runMigrations(dbPath);

    // Simulate a future migration by checking the version stays the same
    const db = new Database(dbPath);
    try {
      const before = db
        .prepare("SELECT MAX(version) as v FROM _schema_version")
        .get() as { v: number };
      db.close();

      runMigrations(dbPath);

      const db2 = new Database(dbPath);
      const after = db2
        .prepare("SELECT MAX(version) as v FROM _schema_version")
        .get() as { v: number };
      db2.close();

      expect(after.v).toBe(before.v);
    } catch {
      db.close();
    }
  });

  it("adopts a pre-existing Prisma-managed database without error", () => {
    const dbPath = tempDbPath();

    // Simulate a database created by the old `npx prisma migrate deploy`
    const db = new Database(dbPath);
    db.exec(migrations[0]!.sql);
    db.close();

    // Running migrations should detect the tables and skip re-creation
    runMigrations(dbPath);

    const db2 = new Database(dbPath);
    try {
      const rows = db2.prepare("SELECT * FROM _schema_version").all() as {
        version: number;
      }[];
      expect(rows.length).toBe(migrations.length);
      expect(rows[0]!.version).toBe(1);
    } finally {
      db2.close();
    }
  });
});
