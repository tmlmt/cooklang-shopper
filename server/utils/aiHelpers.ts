import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { AiConfig } from "~~/shared/types";

export function mapProviderError(err: unknown): ReturnType<typeof createError> {
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

export async function streamAiCompletion(
  systemPrompt: string,
  userMessage: string,
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
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
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
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
