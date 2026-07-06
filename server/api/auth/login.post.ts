import * as v from "valibot";
import { getPasswordProvider } from "#server/utils/appConfig";
import type { Role } from "~~/shared/types";

const LoginSchema = v.object({
  role: v.picklist(["viewer", "editor", "admin"] satisfies Role[]),
  password: v.pipe(v.string(), v.nonEmpty(), v.maxLength(1024)),
});

export default defineEventHandler(async (event) => {
  const config = await getAppConfig();
  const pwProvider = getPasswordProvider(config);
  if (!pwProvider) {
    throw createError({
      status: 403,
      message: "Password authentication is not enabled",
    });
  }

  const { role, password } = await readValidatedBody(event, (body) =>
    v.parse(LoginSchema, body),
  );

  const hashedPassword =
    role === "editor"
      ? pwProvider.config.password_editor
      : role === "admin"
        ? pwProvider.config.password_admin
        : pwProvider.config.password_viewer;

  if (!hashedPassword) {
    throw createError({
      status: 403,
      message: "Admin password login is not configured",
    });
  }

  const valid = await verifyPassword(hashedPassword, password);

  if (!valid) {
    throw createError({ status: 401, message: "Invalid password" });
  }

  await setUserSession(event, {
    user: { profile: "Chef", role, provider: "password", userId: role },
  });

  return { loggedIn: true };
});
