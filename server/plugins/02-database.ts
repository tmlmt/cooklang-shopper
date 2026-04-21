import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { runMigrations } from "../utils/migrations";

export default defineNitroPlugin(async () => {
  const dataDir = path.resolve(process.cwd(), "data");
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.resolve(dataDir, "cooklang-shopper.db");
  runMigrations(dbPath);

  // Initialize the singleton so it's ready for requests
  getDb();
});
