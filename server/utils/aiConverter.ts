import TurndownService from "turndown";
import { parseHTML } from "linkedom";
import type { AiConfig } from "~~/shared/types";
import { AI_SYSTEM_PROMPT } from "#server/utils/aiConversionPrompt";
import { streamAiCompletion } from "#server/utils/aiHelpers";

// linkedom's parseHTML types reflect Window & globalThis which lacks `document`
// in the server TS lib (no DOM). We use a minimal inline type for safety.
type HtmlDoc = {
  querySelectorAll(sel: string): Iterable<{
    remove(): void;
    getAttribute(name: string): string | null;
    innerHTML: string;
  }>;
  querySelector(sel: string): { innerHTML: string } | null;
};

function parseHtmlDoc(html: string): HtmlDoc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (parseHTML(html) as any).document as HtmlDoc;
}

const NOISE_SELECTORS = ["script", "style", "nav", "header", "footer", "aside"];
const NOISE_CLASS_ID_PATTERN = /\b(ad|banner|cookie|popup)\b/i;
const MAX_CONTENT_LENGTH = 15000;
const MIN_CONTENT_LENGTH = 200;

export async function scrapeRecipeText(url: string): Promise<string> {
  let html: string;
  try {
    const response = await safeFetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CooklangShopper/1.0; +https://github.com/tmlmt/cooklang-shopper)",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      throw createError({
        status: 422,
        message: `Page returned HTTP ${response.status}`,
      });
    }
    html = await response.text();
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      typeof (err as { status: unknown }).status === "number"
    ) {
      throw err;
    }
    throw createError({
      status: 422,
      message: `Could not fetch the page: ${(err as Error).message}`,
    });
  }

  // 1. Try JSON-LD
  const jsonLdMatches = html.matchAll(
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]!);
      const candidates: unknown[] = Array.isArray(data)
        ? data
        : data["@graph"]
          ? (data["@graph"] as unknown[])
          : [data];
      const recipe = candidates.find(
        (d) =>
          d &&
          typeof d === "object" &&
          (d as Record<string, unknown>)["@type"] === "Recipe",
      ) as Record<string, unknown> | undefined;
      if (recipe) {
        const parts: string[] = [];
        if (recipe.name) parts.push(`Name: ${recipe.name}`);
        if (recipe.description)
          parts.push(`Description: ${recipe.description}`);
        if (recipe.recipeYield) parts.push(`Yield: ${recipe.recipeYield}`);
        if (Array.isArray(recipe.recipeIngredient)) {
          parts.push(
            "Ingredients:\n" +
              recipe.recipeIngredient.map((i: unknown) => `- ${i}`).join("\n"),
          );
        }
        if (Array.isArray(recipe.recipeInstructions)) {
          const instructions = recipe.recipeInstructions.map(
            (inst: unknown, idx: number) => {
              const text =
                inst && typeof inst === "object" && "text" in inst
                  ? (inst as { text: string }).text
                  : String(inst);
              return `${idx + 1}. ${text}`;
            },
          );
          parts.push("Instructions:\n" + instructions.join("\n"));
        }
        const result = parts.join("\n\n");
        if (result.length >= MIN_CONTENT_LENGTH) {
          return result.slice(0, MAX_CONTENT_LENGTH);
        }
      }
    } catch {
      // continue to next script tag
    }
  }

  // 2. Fallback: linkedom + turndown
  const htmlDoc = parseHtmlDoc(html);

  for (const selector of NOISE_SELECTORS) {
    for (const el of htmlDoc.querySelectorAll(selector)) {
      el.remove();
    }
  }
  for (const el of htmlDoc.querySelectorAll("[class],[id]")) {
    const cls = el.getAttribute("class") ?? "";
    const id = el.getAttribute("id") ?? "";
    if (NOISE_CLASS_ID_PATTERN.test(cls) || NOISE_CLASS_ID_PATTERN.test(id)) {
      el.remove();
    }
  }

  const content =
    htmlDoc.querySelector("main") ??
    htmlDoc.querySelector("article") ??
    htmlDoc.querySelector('[class*="recipe"]') ??
    htmlDoc.querySelector("body");

  if (!content) {
    throw createError({
      status: 422,
      message: "Could not extract recipe content from the page",
    });
  }

  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
  });
  const markdown = turndown.turndown(content.innerHTML as string);

  if (markdown.length < MIN_CONTENT_LENGTH) {
    throw createError({
      status: 422,
      message: "Scraped content is considered too short to be a valid recipe",
    });
  }

  return markdown.slice(0, MAX_CONTENT_LENGTH);
}

export function streamCooklangConversion(
  sourceText: string,
  config: AiConfig,
  onChunk: (text: string) => void,
): Promise<{ inputTokens: number; outputTokens: number }> {
  return streamAiCompletion(AI_SYSTEM_PROMPT, sourceText, config, onChunk);
}
