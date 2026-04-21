import { loadConfig } from "c12";
import type {
  AppConfig,
  OidcAuthProvider,
  PasswordAuthProvider,
  ShoppingConfig,
  SharingConfig,
} from "~~/shared/types";

const defaultShopping: ShoppingConfig = {
  enabled: false,
};

const defaultSharing: SharingConfig = {
  defaultVisibility: "private",
  allowPublicBrowsing: false,
  viewerCanShare: false,
};

let cachedConfig: AppConfig | null = null;

export async function getAppConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  const { config } = await loadConfig<AppConfig>({
    configFile: "config.yaml",
    rcFile: false,
    packageJson: false,
    dotenv: false,
  });

  if (
    !config.auth?.providers ||
    !Array.isArray(config.auth.providers) ||
    config.auth.providers.length === 0
  ) {
    throw createError({
      statusCode: 500,
      message: "Missing or empty auth.providers in config.yaml",
    });
  }

  const names = config.auth.providers.map((p) => p.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    throw createError({
      statusCode: 500,
      message: `Duplicate auth provider names in config.yaml: ${[...new Set(duplicates)].join(", ")}`,
    });
  }

  const passwordCount = config.auth.providers.filter(
    (p) => p.type === "password",
  ).length;
  if (passwordCount > 1) {
    throw createError({
      statusCode: 500,
      message: "Only one password provider is allowed in config.yaml",
    });
  }

  for (const provider of config.auth.providers) {
    if (!provider.type || !provider.name) {
      throw createError({
        statusCode: 500,
        message: "Each auth provider must have a type and name in config.yaml",
      });
    }

    if (provider.type === "password") {
      const cfg = provider.config;
      if (!cfg?.password_editor || !cfg?.password_viewer) {
        throw createError({
          statusCode: 500,
          message: `Password provider "${provider.name}": missing config.password_editor and/or config.password_viewer`,
        });
      }
    }

    if (provider.type === "oidc") {
      const cfg = provider.config;
      if (!cfg?.clientId || !cfg?.clientSecret || !cfg?.issuerUrl) {
        throw createError({
          statusCode: 500,
          message: `OIDC provider "${provider.name}": missing config.clientId, clientSecret, and/or issuerUrl`,
        });
      }
      if (!config.baseUrl) {
        throw createError({
          statusCode: 500,
          message: `OIDC provider "${provider.name}" requires baseUrl to be set at root level in config.yaml`,
        });
      }
      if (!cfg.roleMapping?.editor?.claim || !cfg.roleMapping?.editor?.value) {
        throw createError({
          statusCode: 500,
          message: `OIDC provider "${provider.name}": missing config.roleMapping.editor.claim and/or value`,
        });
      }
    }
  }

  if (!config.sessionSecret) {
    throw createError({
      statusCode: 500,
      message: "Missing sessionSecret in config.yaml",
    });
  }

  if (config.sharing?.federation?.enabled && !config.baseUrl) {
    throw createError({
      statusCode: 500,
      message:
        "Federation requires baseUrl to be set at root level in config.yaml",
    });
  }

  config.sharing = { ...defaultSharing, ...config.sharing };
  config.shopping = { ...defaultShopping, ...config.shopping };

  cachedConfig = config as AppConfig;
  return cachedConfig;
}

export function getPasswordProvider(
  config: AppConfig,
): PasswordAuthProvider | undefined {
  return config.auth.providers.find(
    (p): p is PasswordAuthProvider => p.type === "password",
  );
}

export function getOidcProviders(config: AppConfig): OidcAuthProvider[] {
  return config.auth.providers.filter(
    (p): p is OidcAuthProvider => p.type === "oidc",
  );
}

export function getOidcProviderByName(
  config: AppConfig,
  name: string,
): OidcAuthProvider | undefined {
  return config.auth.providers.find(
    (p): p is OidcAuthProvider => p.type === "oidc" && p.name === name,
  );
}
