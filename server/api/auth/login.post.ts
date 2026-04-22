import * as v from "valibot";
import { getPasswordProvider } from "#server/utils/appConfig";
import type { Role } from "~~/shared/types";

const LoginSchema = v.object({
  role: v.picklist(["viewer", "editor"] satisfies Role[]),
  password: v.pipe(v.string(), v.nonEmpty(), v.maxLength(1024)),
});

export default defineEventHandler(async (event) => {
  const config = await getAppConfig();
  const pwProvider = getPasswordProvider(config);
  if (!pwProvider) {
    throw createError({
      statusCode: 403,
      message: "Password authentication is not enabled",
    });
  }

  const { role, password } = await readValidatedBody(event, (body) =>
    v.parse(LoginSchema, body),
  );

  const hashedPassword =
    role === "editor"
      ? pwProvider.config.password_editor
      : pwProvider.config.password_viewer;
  const valid = await verifyPassword(hashedPassword, password);

  if (!valid) {
    throw createError({ statusCode: 401, message: "Invalid password" });
  }

  await setUserSession(event, {
    user: { profile: "Chef", role, provider: "password", userId: role },
  });

  return { loggedIn: true };
});
