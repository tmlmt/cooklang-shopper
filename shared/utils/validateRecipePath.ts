import { pathRegex } from "../regex";

export function validateRecipePath(path: string) {
  if (!pathRegex.test(path)) {
    throw new Error("Invalid recipe path");
  }
}
