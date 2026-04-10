import type { RecipeChoices } from "@tmlmt/cooklang-parser";

export interface AppConfig {
  password: string;
  sessionSecret: string;
  experimental?: boolean;
}

export interface RecipeInfo {
  title: string;
  path: string;
  servings: number;
  choices?: RecipeChoices;
}

export interface RecipeRaw {
  path: string;
  rawRecipe: string;
}

export interface RecipeEssentials {
  name: string;
  title: string;
  dir: string;
  servings: number;
  tags: string[];
  lastModified?: string;
  times?: Record<string, string>;
  author?: string;
  source?: string;
}

export interface RecipeIndex {
  [key: string]: RecipeEssentials;
}

export interface MetadataDisplayValue {
  text: string;
  href?: string;
}

export interface RecipeImageManifest {
  coverImage?: string;
  heroImages: string[];
  stepImagesByNumber: Record<string, string>;
  hasImages: boolean;
}

// https://stackoverflow.com/questions/78945320/how-to-handle-nodejs-errors-in-typescript
export interface BaseSystemError<Code extends string = string> extends Error {
  /** The string error code */
  code: Code;

  /** The system-provided error number */
  errno: number;

  /** A system-provided human-readable description of the error */
  message: string;

  /** The name of the system call that triggered the error */
  syscall: string;
}
