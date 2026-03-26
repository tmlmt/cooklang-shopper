import * as v from "valibot";
import { getAppConfig } from "#server/utils/appConfig";

const LoginSchema = v.object({
  password: v.pipe(v.string(), v.nonEmpty()),
});

export default defineEventHandler(async (event) => {
  const { password } = await readValidatedBody(event, (body) =>
    v.parse(LoginSchema, body),
  );

  const { password: hashedPassword } = await getAppConfig();
  const valid = await verifyPassword(hashedPassword, password);

  if (!valid) {
    throw createError({ statusCode: 401, message: "Invalid password" });
  }

  await setUserSession(event, {
    user: { profile: "Chef" },
  });

  return { loggedIn: true };
});
