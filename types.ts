export interface RecipeInfo {
  title: string;
  path: string;
  servings: number;
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
}

export interface RecipeIndex {
  [key: string]: RecipeEssentials;
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
