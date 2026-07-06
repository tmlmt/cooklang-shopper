import { loadConfig } from "c12";
import type {
  AppConfig,
  OidcAuthProvider,
  PasswordAuthProvider,
  GoogleAuthProvider,
  MicrosoftAuthProvider,
  AuthProviderEntry,
  ShoppingConfig,
  SharingConfig,
} from "~~/shared/types";

const AI_PROVIDERS = ["openai", "anthropic", "local"] as const;

/**
 * Reserved provider name used for DB-backed accounts (Google/Microsoft).
 * The session stores this as `provider` so that the shopping-list userKey stays
 * stable regardless of which OAuth provider the account was claimed with.
 */
export const ACCOUNT_PROVIDER = "account";

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
      status: 500,
      message: "Missing or empty auth.providers in config.yaml",
    });
  }

  const names = config.auth.providers.map((p) => p.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    throw createError({
      status: 500,
      message: `Duplicate auth provider names in config.yaml: ${[...new Set(duplicates)].join(", ")}`,
    });
  }

  if (names.includes(ACCOUNT_PROVIDER)) {
    throw createError({
      status: 500,
      message: `"${ACCOUNT_PROVIDER}" is a reserved provider name and cannot be used in config.yaml`,
    });
  }

  const passwordCount = config.auth.providers.filter(
    (p) => p.type === "password",
  ).length;
  if (passwordCount > 1) {
    throw createError({
      status: 500,
      message: "Only one password provider is allowed in config.yaml",
    });
  }

  for (const provider of config.auth.providers) {
    if (!provider.type || !provider.name) {
      throw createError({
        status: 500,
        message: "Each auth provider must have a type and name in config.yaml",
      });
    }

    if (provider.type === "password") {
      const cfg = provider.config;
      if (!cfg?.password_editor || !cfg?.password_viewer) {
        throw createError({
          status: 500,
          message: `Password provider "${provider.name}": missing config.password_editor and/or config.password_viewer`,
        });
      }
    }

    if (provider.type === "oidc") {
      const cfg = provider.config;
      if (!cfg?.clientId || !cfg?.clientSecret || !cfg?.issuerUrl) {
        throw createError({
          status: 500,
          message: `OIDC provider "${provider.name}": missing config.clientId, clientSecret, and/or issuerUrl`,
        });
      }
      if (!config.baseUrl) {
        throw createError({
          status: 500,
          message: `OIDC provider "${provider.name}" requires baseUrl to be set at root level in config.yaml`,
        });
      }
      if (!cfg.roleMapping?.editor?.claim || !cfg.roleMapping?.editor?.value) {
        throw createError({
          status: 500,
          message: `OIDC provider "${provider.name}": missing config.roleMapping.editor.claim and/or value`,
        });
      }
    }

    if (provider.type === "google" || provider.type === "microsoft") {
      const cfg = provider.config;
      if (!cfg?.clientId || !cfg?.clientSecret) {
        throw createError({
          status: 500,
          message: `${provider.type} provider "${provider.name}": missing config.clientId and/or config.clientSecret`,
        });
      }
      if (!config.baseUrl) {
        throw createError({
          status: 500,
          message: `${provider.type} provider "${provider.name}" requires baseUrl to be set at root level in config.yaml`,
        });
      }
    }
  }

  if (!config.sessionSecret) {
    throw createError({
      status: 500,
      message: "Missing sessionSecret in config.yaml",
    });
  }

  if (config.sharing?.federation?.enabled && !config.baseUrl) {
    throw createError({
      status: 500,
      message:
        "Federation requires baseUrl to be set at root level in config.yaml",
    });
  }

  config.sharing = { ...defaultSharing, ...config.sharing };
  config.shopping = { ...defaultShopping, ...config.shopping };

  if (config.ai) {
    const ai = config.ai;
    if (!AI_PROVIDERS.includes(ai.provider as (typeof AI_PROVIDERS)[number])) {
      throw createError({
        status: 500,
        message: `Invalid config.ai.provider "${ai.provider}". Must be one of: ${AI_PROVIDERS.join(", ")}`,
      });
    }
    if (ai.provider !== "local" && !ai.apiKey) {
      throw createError({
        status: 500,
        message: "config.ai.apiKey is required",
      });
    }
    if (!ai.model) {
      console.warn(
        "[AI Converter] config.ai.model is required — feature disabled",
      );
      config.ai = undefined;
    } else if (ai.provider === "local" && !ai.baseUrl) {
      throw createError({
        status: 500,
        message: "config.ai.baseUrl is required for the local provider",
      });
    }
  }

  if (config.auth.directory === undefined) {
    config.auth.directory = "fallback";
  } else if (
    config.auth.directory !== "fallback" &&
    config.auth.directory !== "authoritative"
  ) {
    throw createError({
      status: 500,
      message: `Invalid config.auth.directory "${config.auth.directory}". Must be "fallback" or "authoritative"`,
    });
  }

  if (config.smtp) {
    const smtp = config.smtp;
    if (!smtp.host || !smtp.port || !smtp.from) {
      throw createError({
        status: 500,
        message: "config.smtp requires host, port and from",
      });
    }
    if (smtp.auth && (!smtp.auth.user || !smtp.auth.pass)) {
      throw createError({
        status: 500,
        message: "config.smtp.auth requires both user and pass",
      });
    }
  }

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

export function getGoogleProvider(
  config: AppConfig,
): GoogleAuthProvider | undefined {
  return config.auth.providers.find(
    (p): p is GoogleAuthProvider => p.type === "google",
  );
}

export function getMicrosoftProvider(
  config: AppConfig,
): MicrosoftAuthProvider | undefined {
  return config.auth.providers.find(
    (p): p is MicrosoftAuthProvider => p.type === "microsoft",
  );
}

/** Google + Microsoft providers, i.e. the DB-backed "account" providers. */
export function getAccountProviders(config: AppConfig): AuthProviderEntry[] {
  return config.auth.providers.filter(
    (p) => p.type === "google" || p.type === "microsoft",
  );
}

/** Whether any DB-backed account provider is configured. */
export function hasAccountProviders(config: AppConfig): boolean {
  return getAccountProviders(config).length > 0;
}
