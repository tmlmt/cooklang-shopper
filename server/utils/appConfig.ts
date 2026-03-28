import { loadConfig } from "c12";
import type { AppConfig } from "~~/types";

let cachedConfig: AppConfig | null = null;

export async function getAppConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  const { config } = await loadConfig<AppConfig>({
    configFile: "config.yaml",
    rcFile: false,
    packageJson: false,
    dotenv: false,
  });

  if (!config.password) {
    throw createError({
      statusCode: 500,
      message: "Missing password in config.yaml",
    });
  }

  if (!config.sessionSecret) {
    throw createError({
      statusCode: 500,
      message: "Missing sessionSecret in config.yaml",
    });
  }

  cachedConfig = config as AppConfig;
  return cachedConfig;
}
