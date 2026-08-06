<script setup lang="ts">
import { Recipe, type RecipeChoices } from "@tmlmt/cooklang-parser";
import * as v from "valibot";
import type { FormSubmitEvent, DropdownMenuItem } from "@nuxt/ui";
import { FetchError } from "ofetch";
import type { IngredientOrder } from "~~/shared/types";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const { $t, $ts, $getLocale, $getLocales } = useI18n();

if (!route.params.path) {
  throw createError({
    status: 404,
    statusText: $ts("errors.recipeNotFound"),
  });
}

//---------------------------
// Breadcrumbs
//---------------------------

const pathParams =
  typeof route.params.path === "string"
    ? [route.params.path]
    : route.params.path;

const dirSegments = [
  "Recipes",
  ...pathParams.reduce((acc, item) => {
    acc.push(" / ");
    acc.push(item);
    return acc;
  }, [] as string[]),
];

const maxBreadcrumbLengthMobile = 60;
const maxBreadcrumbLengthDesktop = 180;

function truncateDir(maxLength: number) {
  const full = dirSegments.join("");
  if (full.length <= maxLength) return dirSegments;

  let length = 1; // for "\u2026"
  let startIndex = dirSegments.length;
  for (let i = dirSegments.length - 1; i >= 0; i--) {
    const seg = dirSegments[i]!;
    if (length + seg.length > maxLength) break;
    length += seg.length;
    startIndex = i;
  }
  if (startIndex >= dirSegments.length) startIndex = dirSegments.length - 1;
  const kept = dirSegments.slice(startIndex);
  if (kept[0] === " / ") kept.shift();
  return ["\u2026", " / ", ...kept];
}

const displayDirMobile = computed(() => truncateDir(maxBreadcrumbLengthMobile));
const displayDirDesktop = computed(() =>
  truncateDir(maxBreadcrumbLengthDesktop),
);

const path = pathParams.join("/");
const recipeDir = path.substring(0, path.lastIndexOf("/"));
const recipeName = path.substring(path.lastIndexOf("/") + 1);
const recipePathRef = computed(() => (route.query.mode === "new" ? "" : path));

// Validate provided path
validateRecipePath(path);

// Recipe content endpoint, optionally scoped to a language variant.
const recipeApiUrl = (code: string | undefined) =>
  code ? `/api/recipe/${path}?locale=${code}` : `/api/recipe/${path}`;

//---------------------------
// Config and initialization
//---------------------------

const shoppingStore = useShoppingStore();
const recipeStore = useRecipeStore();
const { viewerCanShare, aiEnabled } = await usePublicConfig();
const { shoppingEnabled } = await useShoppingEnabled();

await callOnce("recipe-index", () => recipeStore.fetchIndex());

if (shoppingEnabled.value) {
  await shoppingStore.init();
}
const { loggedIn } = useUserSession();
const { isEditor } = useRole();

//---------------------------
// Recipe images
//---------------------------

const {
  heroImages,
  stepImagesByNumber,
  status: imageManifestStatus,
  refresh: refreshImageManifest,
} = await useRecipeImageManifest(recipePathRef);

const rawRecipe = ref<string>();
// The language variant currently being viewed (undefined = default file).
const viewLocale = ref<string | undefined>(undefined);

if (route.query.mode === "new") {
  rawRecipe.value = "";
} else {
  // Support ?locale=xx in the URL (set when navigating with "same as recipe" mode)
  const initialLocaleQuery = route.query.locale;
  const initialLocale =
    typeof initialLocaleQuery === "string" &&
    isValidLangCode(initialLocaleQuery)
      ? initialLocaleQuery
      : undefined;
  const res = await useFetch(recipeApiUrl(initialLocale), {
    onResponse({ response }) {
      const localeHeader = response.headers.get("x-recipe-locale");
      if (localeHeader) viewLocale.value = localeHeader;
    },
  });

  if (res.error.value) {
    if (res.error.value.status === 401) {
      await navigateTo("/auth", { replace: true });
    }
    throw createError({
      status: 404,
      statusText: $ts("errors.recipeNotFound"),
    });
  }

  rawRecipe.value = String(res.data.value);
}

const recipe = shallowRef<Recipe>();
watch(
  rawRecipe,
  (newRawRecipe) => {
    if (newRawRecipe) {
      recipe.value = new Recipe(newRawRecipe);
      const servings = shoppingStore.getServings(path);
      if (servings) recipe.value = recipe.value.scaleTo(servings);
    }
  },
  { immediate: true },
);

//---------------------------
// Language / locale
//---------------------------

const recipeKey = path.replace(/\//g, ":");
const indexEntry = computed(() => recipeStore.recipes[recipeKey]);
const {
  currentLocale,
  variantLocales,
  defaultLocale,
  allLocaleOptions,
  isMultilingual,
  setLocale,
} = useRecipeLanguage(indexEntry, undefined);

// Adopt the SSR-served locale only when it's an actual variant file. The
// x-recipe-locale header also reports the default file's language, which is not
// a variant code and must keep the view on the default file.
if (viewLocale.value && variantLocales.value.includes(viewLocale.value)) {
  setLocale(viewLocale.value);
}

const effectiveRecipeLocale = computed(
  () => currentLocale.value ?? defaultLocale.value,
);

// "Page UI language follows recipe language" feature: owns `recipeT` (injected
// into recipe-content components) and the UI-label dictionary loading.
const {
  recipeT,
  pageLanguageModeCookie,
  syncPageUiLocale,
  applyPageLanguageChoice,
} = useRecipeUiLocale(path, {
  recipeDefaultLocale: () => defaultLocale.value,
});

const ingredientDisplayLocale = computed(() =>
  $getLocales().find((l) => l.code === effectiveRecipeLocale.value),
);
provide(
  "ingredientOrder",
  computed(
    () =>
      (ingredientDisplayLocale.value?.ingredientOrder ??
        "quantity-first") as IngredientOrder,
  ),
);

// On page load: apply Same as Recipe mode from the cookie. The dict cache is
// serialized via the SSR payload, so when this runs on the client the dictionary
// is already present — no hydration re-fetch and no race with an immediate toggle.
if (pageLanguageModeCookie.value === "recipe") {
  await syncPageUiLocale(viewLocale.value);
}

/**
 * Show the language selector when either:
 * - the recipe has multiple locale variants, OR
 * - the recipe's effective locale (default file locale) differs from the app locale
 *   (so the user can sync the page UI language to the recipe), OR
 * - there are multiple app locales (the page language mode is configurable even
 *   for monolingual recipes, since the user may switch their app locale)
 */
const showLocaleSelector = computed(() => {
  if (isMultilingual.value) return true;
  const effectiveLocale = currentLocale.value ?? defaultLocale.value;
  if (effectiveLocale !== undefined && effectiveLocale !== $getLocale())
    return true;
  return $getLocales().length > 1;
});

/** Fetch a specific language variant and update the view (client-side, no URL change) */
async function switchViewLocale(code: string | undefined) {
  // Already viewing this variant — no content change needed.
  if (code === currentLocale.value) return;
  try {
    const res = await $fetchWithHeaders<string>(recipeApiUrl(code));
    rawRecipe.value = res;
    setLocale(code);
  } catch {
    toast.add({
      color: "error",
      title: $ts("toast.error"),
      description: $ts("errors.recipeNotFound"),
    });
  }
}

/** Open the recipe locale modal and apply the selected recipe + page language */
async function openLocaleModal() {
  const result = await modalRecipeLocale.open(
    allLocaleOptions.value,
    currentLocale.value,
    $getLocale(),
    defaultLocale.value,
  );
  if (!result) return;

  const { recipeLocale, pageLanguageMode } = result;

  await switchViewLocale(recipeLocale);

  await applyPageLanguageChoice(recipeLocale, pageLanguageMode);
}

//---------------------------
// OG Image
//---------------------------

const siteConfig = useSiteConfig();
const recipeMeta = recipe.value?.metadata as
  Record<string, unknown> | undefined;
const titleMeta = recipe.value?.metadata.title || recipeName;
const descriptionMeta =
  (recipeMeta?.description as string) ||
  (recipeMeta?.introduction as string) ||
  "";
const siteBaseUrl = (siteConfig.url || "").replace(/\/$/, "");
defineOgImage(
  "RecipeOgImage",
  {
    title: titleMeta,
    description: descriptionMeta,
    coverImage: heroImages.value[0] || "",
    baseUrl: siteBaseUrl.replace(/^https?:\/\//, ""),
    canvasWidth: 1200,
    canvasHeight: 600,
  },
  [
    { key: "og" },
    {
      key: "whatsapp",
      width: 800,
      height: 800,
      props: { canvasWidth: 800, canvasHeight: 800 },
    },
  ],
);

//---------------------------
// Metadata
//---------------------------

useSeoMeta({
  title: titleMeta,
  ogTitle: titleMeta,
  description: descriptionMeta || siteConfig.description || "",
  ogDescription: descriptionMeta || siteConfig.description || "",
});

//---------------------------
// Edit, Move, Delete recipe
//---------------------------

const isEditMode = ref(
  route.query.mode === "edit" || route.query.mode === "new",
);
const isManualEdit = ref(false);
const modalFile = await useModalFile();
const modalConf = await useModalConfirmation();
const modalChoices = await useModalChoices();
const modalImageUpload = await useModalImageUpload();
const modalShare = await useModalShareRecipe();
const modalCookMode = await useModalCookMode();
const modalInput = await useModalInput();
const modalTranslate = await useModalTranslateRecipe();
const modalRecipeLocale = await useModalRecipeLocale();

// Cook mode state — captured from Content.vue's scale-actions slot
const currentScaledRecipe = shallowRef<Recipe | undefined>(undefined);
const currentChoices = ref<RecipeChoices>({});

// Image management
const uploadingImage = ref(false);
const heroOverlayVisible = ref(false);

const availableUploadRoles = computed(() => {
  const roles: { label: string; value: string }[] = [
    { label: "Cover", value: "cover" },
  ];
  if (!recipe.value) return roles;
  let stepCount = 0;
  for (const section of recipe.value.sections) {
    for (const item of section.content) {
      if (item.type === "step") stepCount++;
    }
  }
  for (let i = 1; i <= stepCount; i++) {
    roles.push({ label: `Step ${i}`, value: `step-${i}` });
  }
  return roles;
});

async function openUploadModal() {
  const result = await modalImageUpload.open(availableUploadRoles.value);
  if (!result) return;

  uploadingImage.value = true;
  try {
    const formData = new FormData();
    formData.append("file", result.file);
    formData.append("role", result.role);

    await $fetchWithHeaders(`/api/recipe-images/${path}`, {
      method: "POST",
      body: formData,
    });

    await refreshImageManifest();
    clearRecipeCoverImageCache();

    toast.add({
      title: $ts("toast.success"),
      description: $ts("toast.imageUploaded"),
      color: "success",
    });
  } catch (error: unknown) {
    if (error instanceof FetchError) {
      toast.add({
        color: "error",
        title: $ts("toast.error"),
        description: error.message,
      });
    }
  } finally {
    uploadingImage.value = false;
  }
}

async function deleteImage(imagePath: string) {
  const result = await modalConf.open(
    "Are you sure you want to delete this image?",
    $ts("actions.delete"),
    $ts("actions.cancel"),
  );
  if (!result) return;

  try {
    await $fetchWithHeaders(`/api/recipe-images/${path}`, {
      method: "DELETE",
      body: { imagePath },
    });

    await refreshImageManifest();
    clearRecipeCoverImageCache();

    toast.add({
      title: $ts("toast.success"),
      description: $ts("toast.imageDeleted"),
      color: "success",
    });
  } catch (error: unknown) {
    if (error instanceof FetchError) {
      toast.add({
        color: "error",
        title: $ts("toast.error"),
        description: error.message,
      });
    }
  }
}

const uploadImageItem: DropdownMenuItem = {
  label: $ts("actions.uploadImage"),
  icon: "i-lucide-upload",
  onSelect: openUploadModal,
};

const downloadItem: DropdownMenuItem = {
  label: $ts("actions.downloadCook"),
  icon: "i-lucide-download",
  onSelect: () => {
    if (rawRecipe.value !== undefined) {
      downloadCook(rawRecipe.value, recipeName);
    }
  },
};

const menuItems: DropdownMenuItem[] = [];

if (isEditor.value || viewerCanShare.value) {
  menuItems.push({
    label: $ts("actions.share"),
    icon: "prime:share-alt",
    onSelect: () => {
      modalShare.open(recipeKey, currentLocale.value);
    },
  });
}

if (isEditor.value) {
  menuItems.push(
    {
      label: $ts("actions.edit"),
      icon: "prime:file-edit",
      onSelect: () => {
        isEditMode.value = true;
        isManualEdit.value = true;
      },
    },
    {
      label: $ts("actions.move"),
      icon: "prime:arrow-right",
      onSelect: async () => {
        const result = await modalFile.open(
          "move",
          path,
          recipe.value?.metadata.title,
        );
        if (result) {
          await $fetchWithHeaders(`/api/recipe/${path}`, {
            method: "PATCH",
            body: {
              dir: result.dir,
              fileName: result.name,
            },
          });
          recipeStore.moveRecipe(
            recipeName,
            recipeDir,
            result.name,
            result.dir,
          );
          toast.add({
            title: $ts("toast.success"),
            description: $ts("toast.recipeMoved", {
              path: `${result.dir}/${result.name}`,
            }),
            color: "success",
          });
          await navigateTo(
            `/recipe/${result.dir ? result.dir + "/" : ""}${result.name}`,
          );
        }
      },
    },
    {
      label: $ts("actions.delete"),
      icon: "prime:trash",
      color: "error",
      onSelect: async () => {
        const result = await modalConf.open(
          "Are you sure you want to delete this recipe?",
        );
        if (result) {
          await $fetchWithHeaders(`/api/recipe/${path}`, {
            method: "DELETE",
          });

          recipeStore.removeRecipe(recipeName, recipeDir);
          await shoppingStore.removeRecipe(path);

          toast.add({
            title: $ts("toast.success"),
            description: $ts("toast.recipeDeleted"),
            color: "success",
          });

          await navigateTo("/");
        }
      },
    },
  );
}

//---------------------
// View / Edit Recipe
//---------------------

const newRecipePlaceholder = `---
title: ${recipeName}
servings:
---
`;

const formState = ref({
  recipe: rawRecipe.value || newRecipePlaceholder,
});

// Edit-mode language variants: editLocale tracks which variant is loaded in the
// textarea; variantCache memoises fetched contents (undefined = default file).
// The cache persists while editing and is cleared on leaving edit mode so a later
// edit re-reads from disk.
const editLocale = ref<string | undefined>(undefined);
const variantCache = new Map<string | undefined, string>();

async function loadVariantInEditor(code: string | undefined) {
  const cached = variantCache.get(code);
  if (cached !== undefined) {
    formState.value.recipe = cached;
    editLocale.value = code;
    return;
  }
  try {
    const content = await $fetchWithHeaders<string>(recipeApiUrl(code));
    variantCache.set(code, content);
    formState.value.recipe = content;
    editLocale.value = code;
  } catch {
    toast.add({
      color: "error",
      title: $ts("toast.error"),
      description: $ts("errors.recipeNotFound"),
    });
  }
}

// Sync editor content with the currently-viewed locale when entering edit mode
watch(isEditMode, (editing) => {
  if (editing && route.query.mode !== "new") {
    const content = rawRecipe.value ?? "";
    formState.value.recipe = content;
    // Seed the cache with the current variant so switching back to it skips a round trip,
    // and align editLocale so the correct variant button is highlighted and the correct
    // file is targeted on save.
    variantCache.set(currentLocale.value, content);
    editLocale.value = currentLocale.value;
  }
  // Drop cached variants when leaving edit mode so a later edit re-reads from disk.
  if (!editing) variantCache.clear();
});

// AI converter state
const aiUrl = ref("");
const aiRawText = ref("");
const isAiConverting = ref(false);
const aiStatus = ref("");
const aiCollapsibleOpen = ref(false);

const onConvertWithAi = async () => {
  let sourceText = aiRawText.value;
  isAiConverting.value = true;

  if (aiUrl.value) {
    aiStatus.value = $ts("ai.fetchingPage");
    try {
      const { text } = await $fetchWithHeaders<{ text: string }>(
        "/api/recipe/scrape",
        { method: "POST", body: { url: aiUrl.value } },
      );
      sourceText = text;
    } catch (error: unknown) {
      isAiConverting.value = false;
      aiStatus.value = "";
      toast.add({
        color: "error",
        title: $ts("ai.fetchError"),
        description:
          error instanceof FetchError
            ? error.data?.message || error.message
            : String(error),
      });
      return;
    }
  }

  if (!sourceText.trim()) {
    isAiConverting.value = false;
    toast.add({ color: "error", title: $ts("ai.noContent") });
    return;
  }

  aiStatus.value = $ts("ai.converting");
  formState.value.recipe = "";

  try {
    const response = await fetch("/api/recipe/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sourceText }),
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const err = await response.json();
        message = err?.message || message;
      } catch {
        // ignore parse errors — use the generic HTTP status message
      }
      throw new Error(message);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sentinelFound = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (!sentinelFound) {
        const idx = buffer.indexOf("\x00");
        if (idx !== -1) {
          formState.value.recipe += buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          sentinelFound = true;
        } else {
          formState.value.recipe += buffer;
          buffer = "";
        }
      }
    }
    buffer += decoder.decode();

    if (sentinelFound) {
      try {
        const usage = JSON.parse(buffer);
        toast.add({
          color: "success",
          title: $ts("toast.conversionComplete"),
          duration: 3000,
          description: $ts("toast.conversionTokens", {
            in: usage.in,
            out: usage.out,
          }),
        });
      } catch {
        toast.add({ color: "success", title: $ts("toast.conversionComplete") });
      }
      aiCollapsibleOpen.value = false;
    }
  } catch (error: unknown) {
    if (formState.value.recipe.length > 0) {
      toast.add({
        color: "warning",
        title: $ts("toast.conversionInterrupted"),
        description: $ts("toast.conversionInterruptedDetail"),
      });
    } else {
      toast.add({
        color: "error",
        title: $ts("toast.conversionFailed"),
        description: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    isAiConverting.value = false;
    aiStatus.value = "";
  }
};

const isParsableRecipe = (value: string): boolean => {
  try {
    new Recipe(value);
    return true;
  } catch {
    return false;
  }
};

const schema = v.object({
  recipe: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty($ts("validation.enterRecipe")),
    v.check(isParsableRecipe, $ts("validation.invalidRecipe")),
  ),
});

type Schema = v.InferOutput<typeof schema>;

//---------------------------
// Set as Default
//---------------------------

const isSettingDefault = ref(false);

async function onSetAsDefault() {
  if (!editLocale.value) return; // already is default
  isSettingDefault.value = true;
  try {
    const entry = recipeStore.recipes[recipeKey];
    let oldDefaultLangCode: string | undefined = entry?.defaultLocale;

    if (!oldDefaultLangCode) {
      const result = await modalInput.open(
        $ts("translate.oldDefaultLocaleTitle"),
        $ts("translate.oldDefaultLocaleLabel"),
        "en",
        $ts("actions.confirm"),
      );
      if (!result) {
        isSettingDefault.value = false;
        return;
      }
      oldDefaultLangCode = result.toLowerCase().trim() || undefined;
    }

    const data = await $fetchWithHeaders<{ recipes: Record<string, unknown> }>(
      "/api/recipe/set-default",
      {
        method: "POST",
        body: {
          path,
          newDefaultLangCode: editLocale.value,
          oldDefaultLangCode,
        },
      },
    );
    await recipeStore.fetchIndex();
    void data;
    editLocale.value = undefined;
    toast.add({
      color: "success",
      title: $ts("toast.success"),
      description: $ts("toast.setAsDefaultDone"),
    });
  } catch (error: unknown) {
    if (error instanceof FetchError) {
      toast.add({
        color: "error",
        title: $ts("toast.error"),
        description: error.message,
      });
    }
  } finally {
    isSettingDefault.value = false;
  }
}

//---------------------------
// Translate
//---------------------------

const isTranslating = ref(false);
const translationStatus = ref("");

async function onTranslate() {
  const result = await modalTranslate.open();
  if (!result) return;

  const { locale: targetLocale, method } = result;

  // Pre-fill frontmatter locale key
  const source = formState.value.recipe;

  if (method === "manual") {
    // Insert/replace locale in frontmatter and set as new variant
    formState.value.recipe = injectLocaleInFrontmatter(source, targetLocale);
    editLocale.value = targetLocale;
    return;
  }

  // AI translation
  if (!aiEnabled.value) {
    toast.add({ color: "error", title: $ts("ai.noContent") });
    return;
  }

  isTranslating.value = true;
  translationStatus.value = $ts("translate.translating");
  formState.value.recipe = "";
  editLocale.value = targetLocale;

  try {
    const response = await fetch("/api/recipe/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe: source, targetLocale }),
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const err = await response.json();
        message = err?.message || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sentinelFound = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (!sentinelFound) {
        const errIdx = buffer.indexOf("\x01");
        if (errIdx !== -1) {
          const payload = buffer.slice(errIdx + 1);
          try {
            const { message } = JSON.parse(payload);
            throw new Error(message);
          } catch (e) {
            if (e instanceof SyntaxError)
              throw new Error("Translation failed", { cause: e });
            throw e;
          }
        }
        const idx = buffer.indexOf("\x00");
        if (idx !== -1) {
          formState.value.recipe += buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          sentinelFound = true;
        } else {
          formState.value.recipe += buffer;
          buffer = "";
        }
      }
    }
    buffer += decoder.decode();

    if (sentinelFound) {
      try {
        const usage = JSON.parse(buffer);
        toast.add({
          color: "success",
          title: $ts("toast.translationComplete"),
          duration: 3000,
          description: $ts("toast.conversionTokens", {
            in: usage.in,
            out: usage.out,
          }),
        });
      } catch {
        toast.add({
          color: "success",
          title: $ts("toast.translationComplete"),
        });
      }
    }
  } catch (error: unknown) {
    formState.value.recipe = source;
    editLocale.value = undefined;
    toast.add({
      color: "error",
      title: $ts("translate.failed"),
      description: error instanceof Error ? error.message : String(error),
    });
  } finally {
    isTranslating.value = false;
    translationStatus.value = "";
  }
}

/** Inject or replace `locale: xx` in YAML frontmatter */
function injectLocaleInFrontmatter(content: string, locale: string): string {
  if (!content.startsWith("---")) {
    return `---\nlocale: ${locale}\n---\n\n${content}`;
  }
  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) return content;
  const frontmatter = content.slice(3, endIdx);
  const updated = frontmatter.replace(/^locale:.*$/m, `locale: ${locale}`);
  const newFrontmatter =
    updated === frontmatter
      ? `${frontmatter.trimEnd()}\nlocale: ${locale}\n`
      : updated;
  return `---${newFrontmatter}---${content.slice(endIdx + 3)}`;
}

const onEditSubmit = async (event: FormSubmitEvent<Schema>) => {
  if (route.query.mode === "edit" || isManualEdit.value) {
    try {
      // Save to the locale-specific file if one is being edited
      const savedLocale = editLocale.value;
      const savePath = savedLocale ? `${path}.${savedLocale}` : path;
      await $fetchWithHeaders(`/api/recipe/${savePath}`, {
        method: "PUT",
        body: { recipe: event.data.recipe },
      });
      toast.add({
        color: "success",
        title: $ts("toast.success"),
        description: $ts("toast.recipeSaved"),
      });
      isEditMode.value = false;
      rawRecipe.value = event.data.recipe;
      editLocale.value = undefined;
      setLocale(savedLocale);
      await syncPageUiLocale(savedLocale);
      if (savedLocale) {
        // Saved a language variant: update view to show it and refresh index for updated locales
        await recipeStore.fetchIndex();
      } else {
        // default locale
        recipeStore.updateRecipe(recipeName, recipeDir, event.data.recipe);
      }
      await refreshImageManifest();
      clearRecipeCoverImageCache();
    } catch (error: unknown) {
      if (error instanceof FetchError) {
        toast.add({
          color: "error",
          title: $ts("toast.error"),
          description: error.message,
        });
      }
    }
  } else if (route.query.mode === "new") {
    try {
      await $fetchWithHeaders(`/api/recipes`, {
        method: "POST",
        body: {
          dir: recipeDir,
          name: recipeName,
          content: event.data.recipe,
        },
      });
      toast.add({
        color: "success",
        title: $ts("toast.success"),
        description: $ts("toast.recipeSaved"),
      });
      rawRecipe.value = event.data.recipe;
      recipeStore.addRecipe(recipeName, recipeDir, event.data.recipe);
      await navigateTo(`/recipe/${path}`, { replace: true });
      isEditMode.value = false;
    } catch (error: unknown) {
      if (error instanceof FetchError) {
        toast.add({
          color: "error",
          title: $ts("toast.error"),
          description: error.data,
        });
      }
    }
  }
};

const onEditCancel = async () => {
  if (route.query.mode === "new") {
    await router.back();
  } else {
    editLocale.value = undefined;
    isEditMode.value = false;
  }
};

defineShortcuts({
  escape: () => {
    if (isEditMode.value && route.query.mode !== "new") {
      editLocale.value = undefined;
      isEditMode.value = false;
    }
  },
});

//--------------------
// Shopping List
//--------------------

function hasIngredientChoicesForVariant(
  currentRecipe: Recipe,
  variant?: string,
): boolean {
  const choices = currentRecipe.getChoicesForVariant(variant);
  return choices.ingredientItems.size > 0 || choices.ingredientGroups.size > 0;
}

const addToShoppingList = async (
  scaledRecipe: Recipe,
  servings: number | undefined,
  currentChoices: RecipeChoices,
  currentVariant: string | undefined,
) => {
  if (!scaledRecipe.metadata.title || !servings) return;

  let choicesToStore: RecipeChoices | undefined = currentChoices;

  if (hasIngredientChoicesForVariant(scaledRecipe, currentVariant)) {
    const result = await modalChoices.open(scaledRecipe, currentVariant);
    if (!result) return; // User cancelled
    choicesToStore = result;
  }

  await shoppingStore.addRecipe(
    scaledRecipe.metadata.title,
    currentLocale.value ? `${path}.${currentLocale.value}` : path,
    servings,
    choicesToStore,
  );
  toast.add({
    color: "success",
    title: $ts("toast.success"),
    description: $ts("toast.recipeAddedToList"),
  });
};

const editServingsInShoppingList = async (
  scaledRecipe: Recipe,
  servings: number | undefined,
  currentChoices: RecipeChoices,
  selectedVariant: string | undefined,
) => {
  if (recipe.value?.metadata.title && servings) {
    let choicesToStore = currentChoices;

    const existingChoices = shoppingStore.recipeSelection.find(
      (r) => r.path === path,
    )?.choices;
    const modalVariant = existingChoices?.variant ?? selectedVariant;
    if (hasIngredientChoicesForVariant(scaledRecipe, modalVariant)) {
      const confirmedChoices = await modalChoices.open(
        scaledRecipe,
        modalVariant,
        existingChoices,
      );

      if (!confirmedChoices) return;
      choicesToStore = confirmedChoices;
    }

    await shoppingStore.editServings(path, servings, choicesToStore);
    toast.add({
      color: "success",
      title: $ts("toast.success"),
      description: $ts("toast.recipeServingsModified"),
    });
  }
};

//---------------------
// Header actions
//---------------------

const {
  setHeaderActions,
  setHeaderMenuItems,
  clearHeaderActions,
  clearHeaderMenuItems,
} = useHeaderMenu();

const openCookMode = () => {
  const r = currentScaledRecipe.value ?? recipe.value;
  if (!r) return;
  modalCookMode.open(
    r,
    currentChoices.value,
    stepImagesByNumber.value,
    recipeT,
  );
};

const cookItem: DropdownMenuItem = {
  label: $ts("actions.cook"),
  icon: "i-lucide-cooking-pot",
  color: "secondary",
  variant: "soft",
  onSelect: openCookMode,
};

watch(
  isEditMode,
  () => {
    clearHeaderActions();
    clearHeaderMenuItems();
    if (loggedIn.value) {
      if (!isEditMode.value) {
        setHeaderActions([cookItem, ...menuItems]);
        setHeaderMenuItems([
          ...(isEditor.value ? [uploadImageItem] : []),
          downloadItem,
        ]);
      }
    } else {
      setHeaderActions([cookItem]);
      setHeaderMenuItems([downloadItem]);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex w-full px-4 md:px-1">
    <div v-if="recipe && !isEditMode" class="flex w-full flex-col">
      <div v-if="imageManifestStatus === 'pending'" class="mb-4 md:mb-6">
        <USkeleton class="h-64 w-full rounded-sm" />
      </div>
      <div v-else-if="heroImages.length > 0" class="md:mb-6">
        <UCarousel
          v-slot="{ item, index }"
          :items="heroImages"
          :arrows="heroImages.length > 1"
          :dots="heroImages.length > 1"
          :ui="{
            dots: 'bottom-4 md:-bottom-8',
            prev: 'sm:inset-s-8 cursor-pointer',
            next: 'sm:inset-e-8 cursor-pointer',
          }"
          loop
          class="w-full"
        >
          <div class="group relative">
            <NuxtImg
              v-slot="{ src, isLoaded, imgAttrs }"
              :custom="true"
              :src="item"
              :alt="`${recipe.metadata.title ?? recipeName}${heroImages.length > 1 ? ` image ${index + 1}` : ''}`"
              sizes="640px md:768px lg:1024px xl:1280px 2xl:1536px"
              class="max-h-112 w-full rounded-sm object-cover"
              @click="heroOverlayVisible = !heroOverlayVisible"
            >
              <!-- Show the actual image when loaded -->
              <img v-if="isLoaded" v-bind="imgAttrs" :src="src" />

              <!-- Show a placeholder while loading -->
              <USkeleton v-else class="h-112 w-full" />
            </NuxtImg>
            <div
              v-if="isEditor"
              class="absolute top-3 right-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 md:top-6 md:right-6 md:gap-3"
              :class="{ 'opacity-100!': heroOverlayVisible }"
            >
              <UButton
                icon="i-lucide-upload"
                color="neutral"
                variant="soft"
                size="md"
                class="hidden md:inline-flex"
                @click="openUploadModal()"
              />
              <UButton
                v-if="item.startsWith('/recipes/')"
                icon="i-lucide-trash-2"
                color="error"
                variant="solid"
                size="md"
                class="hidden md:inline-flex"
                @click="deleteImage(item)"
              />
              <UButton
                icon="i-lucide-upload"
                color="neutral"
                variant="soft"
                size="sm"
                class="flex md:hidden"
                @click="openUploadModal()"
              />
              <UButton
                v-if="item.startsWith('/recipes/')"
                icon="i-lucide-trash-2"
                color="error"
                variant="solid"
                size="sm"
                class="flex md:hidden"
                @click="deleteImage(item)"
              />
            </div>
          </div>
        </UCarousel>
      </div>

      <div class="mb-2 flex flex-col gap-4">
        <p class="mt-5 text-sm md:hidden">
          <span v-for="(segment, i) in displayDirMobile" :key="i">{{
            segment
          }}</span>
        </p>
        <p class="hidden text-base md:block">
          <span v-for="(segment, i) in displayDirDesktop" :key="i">{{
            segment
          }}</span>
        </p>
        <h1 class="hidden items-center gap-2 text-4xl font-extrabold md:flex">
          {{ recipe.metadata.title ?? $t("recipe.untitled") }}
          <RecipeLanguageSelector
            v-if="showLocaleSelector"
            :current-locale="currentLocale"
            @open="openLocaleModal"
          />
        </h1>
        <h1 class="flex items-center gap-2 text-3xl font-extrabold md:hidden">
          {{ recipe.metadata.title ?? $t("recipe.untitled") }}
          <RecipeLanguageSelector
            v-if="showLocaleSelector"
            :current-locale="currentLocale"
            @open="openLocaleModal"
          />
        </h1>
      </div>
      <RecipeMetadataBlock :recipe="recipe" />
      <RecipeContent
        :recipe="recipe"
        :step-images-by-number="stepImagesByNumber"
        :editable="isEditor"
        @delete-image="deleteImage"
        @update:scaled-recipe="(r) => (currentScaledRecipe = r)"
        @update:choices="(c) => (currentChoices = c)"
      >
        <template
          #scale-actions="{
            servings,
            choices,
            selectedVariant,
            scaledRecipe: sr,
          }"
        >
          <UButton
            v-if="
              loggedIn &&
              shoppingEnabled &&
              !shoppingStore.isRecipeInSelection(path)
            "
            size="sm"
            color="primary"
            :label="$ts('addToList')"
            icon="material-symbols:add-shopping-cart-rounded"
            class="ml-2"
            @click="addToShoppingList(sr, servings, choices, selectedVariant)"
          />
          <UButton
            v-else-if="
              loggedIn &&
              shoppingEnabled &&
              shoppingStore.isRecipeInSelection(path)
            "
            size="sm"
            class="ml-2"
            color="secondary"
            @click="
              editServingsInShoppingList(sr, servings, choices, selectedVariant)
            "
            ><Icon
              class="text-lg"
              name="material-symbols:change-circle-rounded"
          /></UButton>
        </template>
      </RecipeContent>
    </div>
    <div v-else class="mt-4 flex w-full flex-col gap-4 md:mt-0">
      <p class="text-sm md:hidden">
        <span v-for="(segment, i) in displayDirMobile" :key="i">{{
          segment
        }}</span>
      </p>
      <p class="hidden text-base md:block">
        <span v-for="(segment, i) in displayDirDesktop" :key="i">{{
          segment
        }}</span>
      </p>
      <UForm
        :state="formState"
        :schema="schema"
        class="flex w-full flex-col"
        @submit="onEditSubmit"
      >
        <!-- Language variant selector (only for existing recipes with variants, or when a translation is in progress) -->
        <div
          v-if="
            isEditor &&
            (isMultilingual || editLocale !== undefined) &&
            route.query.mode !== 'new'
          "
          class="mb-4 flex flex-wrap items-center gap-2"
        >
          <span class="text-sm text-muted"
            >{{ $t("translate.editingVariant") }}:</span
          >
          <UFieldGroup size="sm">
            <UButton
              :variant="editLocale === undefined ? 'solid' : 'outline'"
              color="neutral"
              :label="
                defaultLocale?.toUpperCase() ?? $ts('translate.defaultLocale')
              "
              @click="loadVariantInEditor(undefined)"
            />
            <UButton
              v-for="lang in variantLocales"
              :key="lang"
              :variant="editLocale === lang ? 'solid' : 'outline'"
              color="neutral"
              :label="lang.toUpperCase()"
              @click="loadVariantInEditor(lang)"
            />
            <!-- Show the in-progress variant even before it has been saved -->
            <UButton
              v-if="
                editLocale !== undefined && !variantLocales.includes(editLocale)
              "
              variant="solid"
              color="neutral"
              :label="editLocale.toUpperCase()"
            />
          </UFieldGroup>
          <UButton
            v-if="editLocale !== undefined"
            size="sm"
            color="primary"
            variant="soft"
            :label="$ts('translate.setAsDefault')"
            :loading="isSettingDefault"
            @click="onSetAsDefault"
          />
          <UButton
            size="sm"
            color="secondary"
            variant="soft"
            :label="$ts('translate.buttonLabel')"
            icon="material-symbols:translate"
            :disabled="isTranslating || isAiConverting"
            @click="onTranslate"
          />
          <UChatShimmer
            v-if="translationStatus"
            :text="translationStatus"
            class="text-sm text-muted"
          />
        </div>
        <!-- Translate button for single-language recipes with no translation in progress -->
        <div
          v-else-if="
            isEditor &&
            !isMultilingual &&
            editLocale === undefined &&
            route.query.mode !== 'new'
          "
          class="mb-4 flex items-center gap-2"
        >
          <UButton
            size="sm"
            color="secondary"
            variant="soft"
            :label="$ts('translate.buttonLabel')"
            icon="material-symbols:translate"
            :disabled="isTranslating || isAiConverting"
            @click="onTranslate"
          />
          <UChatShimmer
            v-if="translationStatus"
            :text="translationStatus"
            class="text-sm text-muted"
          />
        </div>
        <div v-if="route.query.mode === 'new' && aiEnabled" class="mb-4">
          <UCollapsible v-model:open="aiCollapsibleOpen">
            <UButton class="group" color="neutral" variant="soft" size="sm">
              <span class="flex items-center gap-2">
                <UIcon name="i-lucide-sparkles" class="size-4 shrink-0" />
                {{ $t("ai.convertFromUrl") }}
              </span>
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </UButton>
            <template #content>
              <UCard class="mt-2" variant="soft">
                <div class="flex flex-col gap-3">
                  <UInput
                    v-model="aiUrl"
                    placeholder="https://..."
                    :disabled="isAiConverting"
                  />
                  <UTextarea
                    v-model="aiRawText"
                    :placeholder="$ts('ai.pasteText')"
                    :rows="5"
                    :disabled="isAiConverting"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                  />
                  <p class="text-xs text-muted">
                    {{ $t("ai.urlWarning") }}
                  </p>
                  <div class="flex flex-row items-center gap-3">
                    <UButton
                      :label="$ts('actions.convertWithAi')"
                      :loading="isAiConverting"
                      :disabled="!aiUrl && !aiRawText"
                      size="sm"
                      @click="onConvertWithAi"
                    />
                    <UButton
                      :label="$ts('actions.openInCookMd')"
                      icon="i-lucide-external-link"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      :disabled="!aiUrl.startsWith('http')"
                      :to="`https://cook.md/${aiUrl}`"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                    <UChatShimmer
                      v-if="aiStatus"
                      :text="aiStatus"
                      class="text-sm text-muted"
                    />
                  </div>
                </div>
              </UCard>
            </template>
          </UCollapsible>
        </div>
        <UFormField name="recipe" :required="true">
          <UTextarea
            v-model="formState.recipe"
            class="w-full"
            :rows="20"
            fluid
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </UFormField>
        <div class="mt-4 flex flex-row gap-4">
          <UButton
            type="submit"
            :label="$ts('actions.save')"
            class="resize-y"
          />
          <UButton
            type="button"
            color="secondary"
            :label="$ts('actions.cancel')"
            @click="onEditCancel"
          />
        </div>
      </UForm>
    </div>
  </div>
</template>
