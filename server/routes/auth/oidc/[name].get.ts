import { getOidcProviderByName } from "#server/utils/appConfig";
import type { Role, OidcRoleMapping } from "~~/shared/types";

function matchesClaim(
  user: Record<string, unknown>,
  mapping: OidcRoleMapping,
): boolean {
  const claimValue = user[mapping.claim];
  if (Array.isArray(claimValue)) {
    return claimValue.includes(mapping.value);
  }
  return claimValue === mapping.value;
}

function resolveRole(
  user: Record<string, unknown>,
  roleMapping: { editor: OidcRoleMapping; viewer?: OidcRoleMapping },
): Role {
  if (matchesClaim(user, roleMapping.editor)) return "editor";
  if (roleMapping.viewer && matchesClaim(user, roleMapping.viewer))
    return "viewer";
  return "viewer";
}

function resolveProfile(user: Record<string, unknown>): string {
  return (
    (user.name as string) ??
    (user.preferred_username as string) ??
    (user.email as string) ??
    (user.sub as string) ??
    "User"
  );
}

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, "name");
  if (!name) {
    throw createError({ status: 400, message: "Missing provider name" });
  }

  const config = await getAppConfig();
  const provider = getOidcProviderByName(config, name);
  if (!provider) {
    throw createError({
      status: 404,
      message: `OIDC provider "${name}" not found`,
    });
  }

  const oidc = provider.config;
  const handler = defineOAuthOidcEventHandler({
    config: {
      clientId: oidc.clientId,
      clientSecret: oidc.clientSecret,
      openidConfig: oidc.issuerUrl,
      scope: oidc.scope || ["openid"],
      redirectURL: config.baseUrl
        ? `${config.baseUrl.replace(/\/$/, "")}/auth/oidc/${name}`
        : "",
    },
    async onSuccess(event, { user }) {
      const claims = user as unknown as Record<string, unknown>;
      const role = resolveRole(claims, oidc.roleMapping);
      const profile = resolveProfile(claims);
      const userId = String(claims.sub ?? "unknown");

      await setUserSession(event, {
        user: { profile, role, provider: name!, userId },
      });

      return sendRedirect(event, "/");
    },
    async onError(event) {
      return sendRedirect(event, "/auth?error=oidc");
    },
  });

  try {
    return await handler(event);
  } catch {
    return sendRedirect(event, "/auth?error=oidc-unreachable");
  }
});
