export function $fetchWithHeaders<T>(
  url: string,
  options?: Parameters<typeof $fetch>[1],
) {
  const headers = useRequestHeaders(["cookie"]);

  return $fetch<T>(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });
}
