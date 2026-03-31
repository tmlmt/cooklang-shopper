import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "~~": path.resolve(process.cwd()),
          },
        },
        test: {
          name: "unit",
          include: ["test/unit/*.{test,spec}.ts"],
          environment: "node",
        },
      },
    ],
  },
});
