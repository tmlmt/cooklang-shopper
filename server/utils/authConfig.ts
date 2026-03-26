import { loadConfig } from "c12";
import type { AuthConfig } from "~~/types";

let cachedConfig: AuthConfig | null = null;

export async function getAuthConfig(): Promise<AuthConfig> {
  if (cachedConfig) return cachedConfig;

  const { config } = await loadConfig<AuthConfig>({
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

  cachedConfig = config as AuthConfig;
  return cachedConfig;
}
