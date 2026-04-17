import * as v from "valibot";
import { getAppConfig } from "#server/utils/appConfig";
import type { Role } from "~~/shared/types";

const LoginSchema = v.object({
  role: v.picklist(["viewer", "editor"] satisfies Role[]),
  password: v.pipe(v.string(), v.nonEmpty()),
});

export default defineEventHandler(async (event) => {
  const { role, password } = await readValidatedBody(event, (body) =>
    v.parse(LoginSchema, body),
  );

  const config = await getAppConfig();
  const hashedPassword = config.auth.password![role];
  const valid = await verifyPassword(hashedPassword, password);

  if (!valid) {
    throw createError({ statusCode: 401, message: "Invalid password" });
  }

  await setUserSession(event, {
    user: { profile: "Chef", role },
  });

  return { loggedIn: true };
});
