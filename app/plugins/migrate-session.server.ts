export default defineNuxtPlugin({
  name: "migrate-session",
  dependsOn: ["session-fetch-plugin"],
  async setup() {
    const { user, clear } = useUserSession();
    if (user.value && !user.value.role) {
      await clear();
    }
  },
});
