import { loadConfig } from "c12";
import type { AppConfig, SharingConfig } from "~~/shared/types";

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

  if (!config.auth?.provider) {
    throw createError({
      statusCode: 500,
      message: "Missing auth.provider in config.yaml",
    });
  }

  if (config.auth.provider === "password") {
    if (!config.auth.password?.editor || !config.auth.password?.viewer) {
      throw createError({
        statusCode: 500,
        message:
          "Missing auth.password.editor and/or auth.password.viewer in config.yaml",
      });
    }
  }

  if (!config.sessionSecret) {
    throw createError({
      statusCode: 500,
      message: "Missing sessionSecret in config.yaml",
    });
  }

  config.sharing = { ...defaultSharing, ...config.sharing };

  cachedConfig = config as AppConfig;
  return cachedConfig;
}
