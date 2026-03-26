import * as v from "valibot";
import { getAuthConfig } from "#server/utils/authConfig";

const LoginSchema = v.object({
  password: v.pipe(v.string(), v.nonEmpty()),
});

export default defineEventHandler(async (event) => {
  const { password } = await readValidatedBody(event, (body) =>
    v.parse(LoginSchema, body),
  );

  const { password: hashedPassword } = await getAuthConfig();
  const valid = await verifyPassword(hashedPassword, password);

  if (!valid) {
    throw createError({ statusCode: 401, message: "Invalid password" });
  }

  await setUserSession(event, {
    user: { profile: "Chef" },
  });

  return { loggedIn: true };
});
