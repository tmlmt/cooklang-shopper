import { connect } from "node:net";
import { getOidcProviderByName } from "#server/utils/appConfig";

function isReachable(
  host: string,
  port: number,
  timeout = 3000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect(port, host);
    socket.setTimeout(timeout);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, "name");
  if (!name) {
    throw createError({ statusCode: 400, message: "Missing provider name" });
  }

  const config = await getAppConfig();
  const provider = getOidcProviderByName(config, name);
  if (!provider) {
    throw createError({
      statusCode: 404,
      message: `OIDC provider "${name}" not found`,
    });
  }

  const url = new URL(provider.config.issuerUrl);
  const port = url.port
    ? Number(url.port)
    : url.protocol === "https:"
      ? 443
      : 80;

  const reachable = await isReachable(url.hostname, port);
  if (!reachable) {
    throw createError({
      statusCode: 502,
      message: `OIDC provider "${name}" is not reachable`,
    });
  }

  return { reachable: true };
});
