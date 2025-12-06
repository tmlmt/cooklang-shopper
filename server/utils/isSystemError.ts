interface SystemError<Code extends string = string> extends Error {
  /** The string error code */
  code: Code;
  /** The system-provided error number */
  errno: number;
  /** A system-provided human-readable description of the error */
  message: string;
  /** The name of the system call that triggered the error */
  syscall: string;
}

export function isSystemError(error: unknown): error is SystemError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

export function isSystemErrorWithCode<T extends string>(
  error: unknown,
  code: T,
): error is SystemError<T> {
  return isSystemError(error) && error.code === code;
}
