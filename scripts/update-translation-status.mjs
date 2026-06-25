#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const readmePath = path.join(repoRoot, "README.md");
const nuxtConfigPath = path.join(repoRoot, "nuxt.config.ts");

const START_TAG = "<!--TRANSLATION_STATUS_START-->";
const END_TAG = "<!--TRANSLATION_STATUS_END-->";

function parseLocaleConfig(source) {
  const defaultLocaleMatch = source.match(/defaultLocale\s*:\s*"([^"]+)"/);
  const defaultLocale = defaultLocaleMatch?.[1];

  const localesMatch = source.match(
    /locales\s*:\s*\[(.*?)\]\s*,\s*defaultLocale/s,
  );
  if (!localesMatch) {
    throw new Error("Unable to find i18n.locales block in nuxt.config.ts");
  }

  const localesBlock = localesMatch[1];
  const objectMatches = localesBlock.match(/\{[\s\S]*?\}/g) ?? [];
  const locales = new Map();

  for (const objectText of objectMatches) {
    const codeMatch = objectText.match(/code\s*:\s*"([^"]+)"/);
    if (!codeMatch) continue;

    const displayNameMatch = objectText.match(/displayName\s*:\s*"([^"]+)"/);
    const flagMatch = objectText.match(/flag\s*:\s*"([^"]+)"/);

    locales.set(codeMatch[1], {
      code: codeMatch[1],
      displayName: displayNameMatch?.[1] ?? codeMatch[1],
      flag: flagMatch?.[1] ?? "",
    });
  }

  return { locales, defaultLocale };
}

function parseCrowdinStatus(source) {
  const translated = new Map();
  const proofread = new Map();

  let section = "";
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === "Translated:") {
      section = "translated";
      continue;
    }

    if (line === "Proofread:") {
      section = "proofread";
      continue;
    }

    const match = line.match(/^([\w-]+)\s+(\d+(?:\.\d+)?)$/);
    if (!match) continue;

    const [, code, value] = match;
    const numeric = Number(value);

    if (section === "translated") {
      translated.set(code, numeric);
    } else if (section === "proofread") {
      proofread.set(code, numeric);
    }
  }

  return { translated, proofread };
}

function buildRows(locales, status, defaultLocale) {
  const rows = Array.from(locales.keys()).map((code) => {
    const locale = locales.get(code);
    const displayName = locale?.displayName ?? code;
    const flag = locale?.flag ?? "";
    const language = flag ? `${flag} ${displayName}` : displayName;
    const fallback = code === defaultLocale ? 100 : 0;
    const translation = status.translated.get(code) ?? fallback;
    const proofreading = status.proofread.get(code) ?? fallback;

    return {
      code,
      language,
      displayName,
      translation,
      proofreading,
    };
  });

  rows.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    }),
  );

  return rows;
}

function formatPercent(value) {
  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `${rounded}%`;
}

function buildTable(rows) {
  const lines = [
    "| Language | Translation (%) | Proofreading (%) |",
    "| --- | ---: | ---: |",
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.language} | ${formatPercent(row.translation)} | ${formatPercent(row.proofreading)} |`,
    );
  }

  return lines.join("\n");
}

function injectStatusTable(readme, table) {
  const startIndex = readme.indexOf(START_TAG);
  const endIndex = readme.indexOf(END_TAG);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = readme.slice(0, startIndex + START_TAG.length);
    const after = readme.slice(endIndex);
    return `${before}\n${table}\n${after}`;
  }

  const sectionHeader = "## Translations";
  const sectionStart = readme.indexOf(sectionHeader);
  if (sectionStart === -1) {
    throw new Error("Translations section was not found in README.md");
  }

  const rest = readme.slice(sectionStart + sectionHeader.length);
  const nextHeadingMatch = rest.match(/\n##\s+/);
  const sectionEnd = nextHeadingMatch
    ? sectionStart + sectionHeader.length + nextHeadingMatch.index
    : readme.length;

  const before = readme.slice(0, sectionEnd).replace(/\s*$/, "");
  const after = readme.slice(sectionEnd);
  const block = `\n\n${START_TAG}\n${table}\n${END_TAG}\n`;

  return `${before}${block}${after}`;
}

async function main() {
  const [nuxtConfigSource, readmeSource] = await Promise.all([
    readFile(nuxtConfigPath, "utf8"),
    readFile(readmePath, "utf8"),
  ]);

  const crowdinOutput = execSync("crowdin status --plain", {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const { locales, defaultLocale } = parseLocaleConfig(nuxtConfigSource);
  const status = parseCrowdinStatus(crowdinOutput);
  const rows = buildRows(locales, status, defaultLocale);
  const table = buildTable(rows);
  const updatedReadme = injectStatusTable(readmeSource, table);

  await writeFile(readmePath, updatedReadme, "utf8");
  process.stdout.write(`${table}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
