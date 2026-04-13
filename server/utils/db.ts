import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "~~/generated/prisma/client";

let prisma: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (prisma) return prisma;

  const dbPath = path.resolve(process.cwd(), "data", "cooklang-shopper.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  prisma = new PrismaClient({ adapter });
  return prisma;
}
