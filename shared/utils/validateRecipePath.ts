import { pathRegex } from "../regex";

export function validateRecipePath(path: string) {
  if (!pathRegex.test(path)) {
    throw new Error(
      "Only letters, digits, spaces, and & ( ) ' _ + % . - are allowed",
    );
  }
  return true;
}
