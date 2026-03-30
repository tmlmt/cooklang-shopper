import pkg from "../../package.json";

const GITHUB_REPO = "tmlmt/cooklang-shopper";

export default defineCachedEventHandler(
  async (event) => {
    await requireUserSession(event);

    const response = await $fetch<{ tag_name: string }>(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    const latestVersion = response.tag_name.replace(/^v/, "");
    const currentVersion = pkg.version;

    return {
      currentVersion,
      latestVersion,
      updateAvailable: latestVersion !== currentVersion,
    };
  },
  {
    maxAge: 60,
  },
);
