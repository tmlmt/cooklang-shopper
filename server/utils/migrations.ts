import { readFileSync } from "node:fs";
import path from "node:path";
import { globSync } from "glob";

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
