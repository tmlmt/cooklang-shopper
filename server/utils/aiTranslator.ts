import type { AiConfig } from "~~/shared/types";
import { TRANSLATION_SYSTEM_PROMPT } from "#server/utils/aiTranslationPrompt";
import { streamAiCompletion } from "#server/utils/aiHelpers";

export function streamRecipeTranslation(
  recipeContent: string,
  targetLocale: string,
  config: AiConfig,
  onChunk: (text: string) => void,
): Promise<{ inputTokens: number; outputTokens: number }> {
  const userMessage = `Translate this recipe to the main language spoken in the following country '${targetLocale}' (ISO 639-1 code):\n\n${recipeContent}`;
  return streamAiCompletion(
    TRANSLATION_SYSTEM_PROMPT,
    userMessage,
    config,
    onChunk,
  );
}
