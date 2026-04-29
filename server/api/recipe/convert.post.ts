import { streamCooklangConversion } from "#server/utils/aiConverter";

export default defineEventHandler(async (event) => {
  await requireEditorRole(event);

  const { text } = await readBody<{ text: string }>(event);

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw createError({ status: 400, message: "text is required" });
  }

  const config = await getAppConfig();

  if (!config.ai) {
    throw createError({
      status: 501,
      message: "AI conversion is not configured",
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
        const { inputTokens, outputTokens } = await streamCooklangConversion(
          text,
          ai,
          (chunk: string) => {
            controller.enqueue(encoder.encode(chunk));
          },
        );
        console.info(
          `[AI Converter] Completed — input: ${inputTokens} tokens, output: ${outputTokens} tokens`,
        );
        // Append sentinel with usage data for the client
        controller.enqueue(
          encoder.encode(
            `\x00${JSON.stringify({ in: inputTokens, out: outputTokens })}`,
          ),
        );
        controller.close();
      } catch (err: unknown) {
        controller.error(err);
      }
    },
  });

  return sendStream(event, stream);
});
