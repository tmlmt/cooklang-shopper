import { streamRecipeTranslation } from "#server/utils/aiTranslator";

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  const { recipe, targetLocale } = await readBody<{
    recipe: string;
    targetLocale: string;
  }>(event);

  if (!recipe || typeof recipe !== "string" || recipe.trim().length === 0) {
    throw createError({ status: 400, message: "recipe is required" });
  }
  if (
    !targetLocale ||
    typeof targetLocale !== "string" ||
    !isValidLangCode(targetLocale)
  ) {
    throw createError({
      status: 400,
      message: "targetLocale must be a valid 2-letter language code",
    });
  }

  const config = await getAppConfig();

  if (!config.ai) {
    throw createError({
      status: 501,
      message: "AI is not configured",
    });
  }

  const ai = config.ai;

  setResponseHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setResponseHeader(event, "Transfer-Encoding", "chunked");
  setResponseHeader(event, "Cache-Control", "no-cache");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { inputTokens, outputTokens } = await streamRecipeTranslation(
          recipe,
          targetLocale,
          ai,
          (chunk: string) => {
            controller.enqueue(encoder.encode(chunk));
          },
        );
        console.info(
          `[AI Translator] Completed — input: ${inputTokens} tokens, output: ${outputTokens} tokens`,
        );
        controller.enqueue(
          encoder.encode(
            `\x00${JSON.stringify({ in: inputTokens, out: outputTokens })}`,
          ),
        );
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : String(err);
        console.error("[AI Translator] Error:", message);
        controller.enqueue(
          encoder.encode(`\x01${JSON.stringify({ message })}`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return sendStream(event, stream);
});
