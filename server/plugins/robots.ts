export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("robots:config", async (ctx) => {
    if (ctx.context !== "robots.txt") return;

    const publicPaths = await getPublicRecipePaths();

    const allow: string[] = ["/$"];

    for (const recipePath of publicPaths) {
      const encoded = recipePath
        .split(":")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      allow.push(`/recipe/${encoded}`);
    }

    if (ctx.groups[0]) {
      ctx.groups[0].disallow = ["/"];
      ctx.groups[0].allow = allow;
    }
  });
});
