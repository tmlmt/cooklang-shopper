import type { RecipeImageManifest } from "~~/shared/types";

const COVER_CACHE_STATE_KEY = "recipe-cover-images-cache";

export function clearRecipeCoverImageCache() {
  const cache = useState<Record<string, string | null>>(
    COVER_CACHE_STATE_KEY,
    () => ({}),
  );
  cache.value = {};
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (currentIndex < items.length) {
        const index = currentIndex++;
        results[index] = await mapper(items[index] as T);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

export async function useRecipeImageManifest(
  recipePath: Ref<string> | ComputedRef<string>,
) {
  const cache = useState<Record<string, string | null>>(
    COVER_CACHE_STATE_KEY,
    () => ({}),
  );

  const cachedCover = computed(() => {
    const p = recipePath.value.trim();
    return p ? cache.value[p] : undefined;
  });

  const {
    data: manifest,
    status,
    error,
    refresh,
  } = await useAsyncData<RecipeImageManifest>(
    computed(() => `recipe-images-${recipePath.value.trim()}`).value,
    async () => {
      const p = recipePath.value.trim();
      if (!p) return undefined!;
      return $fetch<RecipeImageManifest>(`/api/recipe-images/${p}`);
    },
    {
      default: () =>
        cachedCover.value
          ? {
              coverImage: cachedCover.value,
              heroImages: [cachedCover.value],
              stepImagesByNumber: {},
              hasImages: true,
            }
          : undefined!,
      watch: [recipePath],
    },
  );

  return {
    manifest,
    status,
    error,
    refresh,
    coverImage: computed(() => manifest.value?.coverImage),
    heroImages: computed(() => manifest.value?.heroImages ?? []),
    stepImagesByNumber: computed(
      () => manifest.value?.stepImagesByNumber ?? {},
    ),
  };
}

export function useRecipeCoverImages(
  recipePaths: Ref<string[]> | ComputedRef<string[]>,
) {
  const cache = useState<Record<string, string | null>>(
    COVER_CACHE_STATE_KEY,
    () => ({}),
  );
  const headers = useRequestHeaders(["cookie"]);

  const coversKey = computed(() => {
    const paths = recipePaths.value.filter((p) => p.trim().length > 0);
    return `recipe-covers-${paths.join(",")}`;
  });

  const { data, status, error, refresh } = useAsyncData(
    coversKey,
    async () => {
      const paths = recipePaths.value.filter((p) => p.trim().length > 0);
      const missing = paths.filter((p) => cache.value[p] === undefined);

      if (missing.length > 0) {
        const manifests = await mapWithConcurrency(missing, 4, (p) =>
          $fetch<RecipeImageManifest>(`/api/recipe-images/${p}`, {
            headers,
          }).catch(() => undefined),
        );

        for (let i = 0; i < missing.length; i++) {
          const p = missing[i] as string;
          cache.value[p] = manifests[i]?.coverImage ?? null;
        }
      }

      return Object.fromEntries(
        paths
          .map((p) => {
            const value = cache.value[p];
            return value ? ([p, value] as const) : undefined;
          })
          .filter((entry): entry is readonly [string, string] =>
            Boolean(entry),
          ),
      );
    },
    { watch: [recipePaths] },
  );

  const covers = computed(() => data.value ?? {});

  return {
    covers,
    status,
    error,
    refresh,
  };
}
