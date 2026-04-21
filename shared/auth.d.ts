import type { Role } from "~~/shared/types";

declare module "#auth-utils" {
  interface User {
    profile: string;
    role: Role;
    provider: string;
    userId: string;
  }
}

export {};
