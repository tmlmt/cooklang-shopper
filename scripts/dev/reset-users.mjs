/**
 * Deletes all users (and their linked identities and invitations) from the
 * database, returning it to the pre-bootstrap state.
 *
 * Usage:
 *   node scripts/reset-users.mjs [--db <path>]
 *
 * Default db path: data/cooklang-shopper.db (relative to cwd).
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { existsSync, unlinkSync } from "node:fs";

const args = process.argv.slice(2);
const dbFlagIndex = args.indexOf("--db");
const dbPath =
  dbFlagIndex !== -1 && args[dbFlagIndex + 1]
    ? args[dbFlagIndex + 1]
    : path.resolve(process.cwd(), "data", "cooklang-shopper.db");

if (!existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);

// Count before
const { count } = db.prepare("SELECT COUNT(*) AS count FROM User").get();
if (count === 0) {
  console.log("No users in the database — nothing to do.");
  db.close();
  process.exit(0);
}

console.log(`Found ${count} user(s). Deleting…`);

// Cascade delete is set on UserIdentity and Invitation, but SQLite doesn't
// enforce FK constraints unless explicitly enabled per-connection.
db.exec("PRAGMA foreign_keys = ON");
db.exec("DELETE FROM User");

const { count: remaining } = db
  .prepare("SELECT COUNT(*) AS count FROM User")
  .get();

db.close();

if (remaining === 0) {
  console.log(
    "Done. All users deleted. The database is ready for a fresh setup.",
  );
} else {
  console.error(`Something went wrong — ${remaining} user(s) still remain.`);
  process.exit(1);
}

// Also remove the admin claim-code file so the server regenerates it on next start.
const claimCodePath = path.resolve(
  path.dirname(dbPath),
  "admin-claim-code.txt",
);
if (existsSync(claimCodePath)) {
  unlinkSync(claimCodePath);
  console.log(
    "Admin claim code file removed — will be regenerated on next server start.",
  );
}
