import type { TranslationDict } from "~~/shared/types";

/**
 * Resolve a dot-separated key against a translation dictionary, interpolating
 * {token} placeholders from params. Returns undefined when the key is missing
 * or does not resolve to a string.
 */
export function resolveTranslationKey(
  dict: TranslationDict,
  key: string,
  params?: Record<string, unknown>,
): string | undefined {
  let val: unknown = dict;
  for (const part of key.split(".")) {
    val = (val as TranslationDict)?.[part];
    if (val === undefined) break;
  }
  if (typeof val !== "string") return undefined;
  if (!params) return val;
  return val.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(params[token] ?? `{${token}}`),
  );
}
