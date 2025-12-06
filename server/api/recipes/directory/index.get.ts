import { glob } from "glob";
import path from "path";

export default defineEventHandler(async () => {
  const dir = path.join(process.cwd(), "public", "recipes");
  const entries = await glob("**/", { cwd: dir });
  return entries
    .filter((dir) => dir !== ".")
    .sort((a, b) => a.localeCompare(b));
});
