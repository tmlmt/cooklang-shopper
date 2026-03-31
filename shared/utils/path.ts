import { pathRegex } from "../regex";

export function validateRecipePath(path: string) {
  if (!pathRegex.test(path)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid recipe path",
    });
  }
}
