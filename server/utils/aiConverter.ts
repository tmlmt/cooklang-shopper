import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import TurndownService from "turndown";
import { parseHTML } from "linkedom";
import type { AiConfig } from "~~/shared/types";
import { AI_SYSTEM_PROMPT } from "#server/utils/aiSystemPrompt";

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
    const response = await fetch(url, {
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

export async function streamCooklangConversion(
  sourceText: string,
  config: AiConfig,
  onChunk: (text: string) => void,
): Promise<{ inputTokens: number; outputTokens: number }> {
  if (config.provider === "openai" || config.provider === "local") {
    const openai = new OpenAI({
      apiKey: config.apiKey ?? "local",
      ...(config.provider === "local" && config.baseUrl
        ? { baseURL: config.baseUrl }
        : {}),
    });

    let stream: Awaited<ReturnType<typeof openai.chat.completions.create>>;
    try {
      stream = await openai.chat.completions.create({
        model: config.model!,
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: sourceText },
        ],
        stream: true,
        stream_options: { include_usage: true },
      });
    } catch (err: unknown) {
      throw mapProviderError(err);
    }

    let inputTokens = 0;
    let outputTokens = 0;
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) onChunk(delta);
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
      }
    } catch (err: unknown) {
      throw mapProviderError(err);
    }
    return { inputTokens, outputTokens };
  }

  // Anthropic
  const anthropic = new Anthropic({ apiKey: config.apiKey });
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const stream = anthropic.messages.stream({
      model: config.model!,
      max_tokens: 4096,
      system: AI_SYSTEM_PROMPT,
      messages: [{ role: "user", content: sourceText }],
    });
    stream.on("text", onChunk);
    const finalMessage = await stream.finalMessage();
    inputTokens = finalMessage.usage.input_tokens;
    outputTokens = finalMessage.usage.output_tokens;
  } catch (err: unknown) {
    throw mapProviderError(err);
  }
  return { inputTokens, outputTokens };
}

function mapProviderError(err: unknown): ReturnType<typeof createError> {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status)
      : 0;

  if (
    status === 401 ||
    msg.includes("401") ||
    msg.toLowerCase().includes("authentication") ||
    msg.toLowerCase().includes("api key")
  ) {
    return createError({
      status: 502,
      message: "AI provider authentication failed",
    });
  }
  if (
    status === 429 ||
    msg.includes("429") ||
    msg.toLowerCase().includes("rate limit")
  ) {
    return createError({
      status: 429,
      message: "AI provider rate limit exceeded",
    });
  }
  return createError({ status: 502, message: `AI provider error: ${msg}` });
}
