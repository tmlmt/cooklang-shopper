import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  chmodSync,
} from "node:fs";
import path from "node:path";

const claimFilePath = path.resolve(
  process.cwd(),
  "data",
  "admin-claim-code.txt",
);

export function getClaimCodeFilePath(): string {
  return claimFilePath;
}

/** Read the current admin claim code, or null if none is pending. */
export function readClaimCode(): string | null {
  if (!existsSync(claimFilePath)) return null;
  const code = readFileSync(claimFilePath, "utf8").trim();
  return code || null;
}

/** Ensure a claim code exists, generating and persisting one if needed. */
export function ensureClaimCode(): string {
  const existing = readClaimCode();
  if (existing) return existing;
  const code = randomBytes(6).toString("hex");
  writeFileSync(claimFilePath, `${code}\n`, { mode: 0o600 });
  try {
    chmodSync(claimFilePath, 0o600);
  } catch {
    // best effort on platforms without POSIX permissions
  }
  return code;
}

/** Remove the claim code once an admin has been established. */
export function clearClaimCode(): void {
  if (existsSync(claimFilePath)) unlinkSync(claimFilePath);
}

/** Constant-time comparison of a submitted code against the pending code. */
export function verifyClaimCode(input: string): boolean {
  const code = readClaimCode();
  if (!code) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(input.trim());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Print an unmissable setup banner (captured by journald / pm2 logs). */
export function printClaimBanner(code: string): void {
  const line = "=".repeat(60);
  console.log(
    [
      "",
      line,
      "  ADMIN SETUP REQUIRED — no users have signed in yet.",
      "",
      "  Option A — Google / Microsoft bootstrap:",
      "  1. Sign in with Google or Microsoft.",
      "  2. When prompted, enter this one-time admin claim code:",
      "",
      `        ${code}`,
      "",
      `  (also saved to: ${claimFilePath})`,
      "",
      "  Option B — password admin:",
      "  Set password_admin in config.yaml for the password provider,",
      "  sign in as admin, then invite other users from User Management.",
      line,
      "",
    ].join("\n"),
  );
}
