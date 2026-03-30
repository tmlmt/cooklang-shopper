import type { NitroFetchOptions, NitroFetchRequest } from "nitropack";

export function $fetchWithHeaders<T>(
  url: string,
  options?: NitroFetchOptions<NitroFetchRequest>,
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
