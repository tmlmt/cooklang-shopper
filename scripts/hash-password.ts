import { promisify } from "node:util";
import { randomBytes, scrypt } from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error("Usage: npx tsx scripts/hash-password.ts <password>");
  process.exit(1);
}

const scryptAsync = promisify(scrypt);

const cost = 16384;
const blockSize = 8;
const parallelization = 1;
const keyLength = 64;
const saltSize = 16;

const salt = randomBytes(saltSize);
const hash = (await scryptAsync(password, salt, keyLength, {
  cost,
  blockSize,
  parallelization,
  maxmem: 32 * 1024 * 1024,
})) as Buffer;

// PHC string format (compatible with @adonisjs/hash scrypt driver)
const saltB64 = salt.toString("base64").replace(/=+$/, "");
const hashB64 = hash.toString("base64").replace(/=+$/, "");
console.log(
  `$scrypt$n=${cost},r=${blockSize},p=${parallelization}$${saltB64}$${hashB64}`,
);
