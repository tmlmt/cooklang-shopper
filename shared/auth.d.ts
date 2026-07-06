import type { Role } from "~~/shared/types";

declare module "#auth-utils" {
  interface User {
    profile: string;
    role: Role;
    provider: string;
    userId: string;
  }

  interface UserSession {
    /**
     * OAuth identity captured during an admin-bootstrap login, pending
     * verification of the one-time claim code. Not a logged-in session.
     */
    pendingClaim?: {
      provider: string;
      subject: string;
      email?: string;
      displayName?: string;
    };
  }
}

export {};
