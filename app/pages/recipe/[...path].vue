<script setup lang="ts">
import { Recipe } from "@tmlmt/cooklang-parser";
import * as v from "valibot";
import type { FormSubmitEvent, DropdownMenuItem } from "@nuxt/ui";
import { FetchError } from "ofetch";

definePageMeta({
  title: "Cooklang Shopper - Recipe detail",
  description: "Weekly meal planner, from recipes to shopping cart",
});

const toast = useToast();
const route = useRoute();
const router = useRouter();

if (!route.params.path) {
  throw createError({
    statusCode: 404,
    statusMessage: "Recipe not found",
  });
}

const pathParams =
  typeof route.params.path === "string"
    ? [route.params.path]
    : route.params.path;

const dir = [
  "Recipes",
  ...pathParams.reduce((acc, item) => {
    acc.push("/");
    acc.push(item);
    return acc;
  }, [] as string[]),
];

const path = pathParams.join("/");
const recipeDir = path.substring(0, path.lastIndexOf("/"));
const recipeName = path.substring(path.lastIndexOf("/") + 1);

// Regex-based validation of provided path
if (!/^(?!\/)(?:[\p{L}\p{N}_ +%.-]+\/)*[\p{L}\p{N}_ +%.-]+$/u.test(path)) {
  throw createError({
    statusCode: 400,
    statusMessage: "Invalid recipe path",
  });
}

const shoppingStore = useShoppingStore();

const rawRecipe = ref<string>();

if (route.query.mode === "new") {
  rawRecipe.value = "";
} else {
  const res = await useFetch(`/api/recipe/${path}`);

  if (res.error.value) {
    throw createError({
      statusCode: 404,
      statusMessage: "Recipe not found",
    });
  }

  rawRecipe.value = String(res.data.value);
}

const recipe = ref<Recipe>();
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
const nonTitleMetaData = computed(() => {
  if (recipe.value) {
    if (!("title" in recipe.value.metadata)) {
      return recipe.value?.metadata;
    }
    const { title, ...filtered } = recipe.value.metadata;
    return filtered;
  }
  return undefined;
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

const menuItems = ref<DropdownMenuItem[]>([
  {
    label: "Edit",
    icon: "prime:file-edit",
    onSelect: () => {
      isEditMode.value = true;
      isManualEdit.value = true;
    },
  },
  {
    label: "Move",
    icon: "prime:arrow-right",
    onSelect: async () => {
      const result = await modalFile.open(
        "move",
        path,
        recipe.value?.metadata.title,
      );
      if (result) {
        await $fetch(`/api/recipe/${path}`, {
          method: "PATCH",
          body: {
            dir: result.dir,
            fileName: result.name,
          },
        });
        toast.add({
          title: "Success",
          description: `Recipe moved to ${result.dir}/${result.name}`,
          color: "success",
        });
        await navigateTo(
          `/recipe/${result.dir ? result.dir + "/" : ""}${result.name}`,
        );
      }
    },
  },
  {
    label: "Delete",
    icon: "prime:trash",
    color: "error",
    onSelect: async () => {
      const result = await modalConf.open(
        "Are you sure you want to delete this recipe?",
      );
      if (result) {
        // Delete recipe
        await $fetch(`/api/recipe/${path}`, {
          method: "DELETE",
        });

        // Remove from selected list (if present)
        shoppingStore.removeRecipe(path);

        // Show success toast
        toast.add({
          title: "Success",
          description: "Recipe deleted",
          color: "success",
        });

        await navigateTo("/");
      }
    },
  },
]);

//---------------------
// View / Edit Recipe
//---------------------

const formState = ref({
  recipe: rawRecipe.value ?? "",
});

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
    v.nonEmpty("Please enter a recipe"),
    v.check(isParsableRecipe, "Invalid recipe. Check syntax"),
  ),
});

type Schema = v.InferOutput<typeof schema>;

const onEditSubmit = async (event: FormSubmitEvent<Schema>) => {
  if (route.query.mode === "edit" || isManualEdit.value) {
    try {
      await $fetch(`/api/recipe/${path}`, {
        method: "PUT",
        body: event.data.recipe,
      });
      toast.add({
        color: "success",
        title: "Success",
        description: "Recipe successfully saved",
        duration: 3000,
      });
      isEditMode.value = false;
      rawRecipe.value = event.data.recipe;
    } catch (error: unknown) {
      if (error instanceof FetchError) {
        toast.add({
          color: "error",
          title: "Error",
          description: error.data,
          duration: 3000,
        });
      }
    }
  } else if (route.query.mode === "new") {
    try {
      await $fetch(`/api/recipes`, {
        method: "POST",
        body: {
          dir: recipeDir,
          name: recipeName,
          content: event.data.recipe,
        },
      });
      toast.add({
        color: "success",
        title: "Success",
        description: "Recipe successfully saved",
        duration: 3000,
      });
      isEditMode.value = false;
      rawRecipe.value = event.data.recipe;
    } catch (error: unknown) {
      if (error instanceof FetchError) {
        toast.add({
          color: "error",
          title: "Error",
          description: error.data,
          duration: 3000,
        });
      }
    }
  }
};

const onEditCancel = async () => {
  if (route.query.mode === "new") {
    await router.back();
  } else {
    isEditMode.value = false;
  }
};

defineShortcuts({
  escape: () => {
    if (isEditMode.value && route.query.mode !== "new") {
      isEditMode.value = false;
    }
  },
});

//--------------------
// Scaling
//--------------------

const servingsSpinner = computed({
  get: () => recipe.value?.servings,
  set: (value) => {
    if (value && recipe.value) {
      recipe.value = recipe.value.scaleTo(value);
    }
  },
});

//--------------------
// Shopping List
//--------------------

const addToShoppingList = () => {
  if (recipe.value?.metadata.title && servingsSpinner.value) {
    shoppingStore.addRecipe(
      recipe.value.metadata.title,
      path,
      servingsSpinner.value,
    );
    toast.add({
      color: "success",
      title: "Success",
      description: "Recipe successfully added to shopping list",
      duration: 3000,
    });
  }
};

const editServingsInShoppingList = () => {
  if (recipe.value?.metadata.title && servingsSpinner.value) {
    shoppingStore.editServings(path, servingsSpinner.value);
    toast.add({
      color: "success",
      title: "Success",
      description: "Servings successfully modified in shopping list",
      duration: 3000,
    });
  }
};
</script>

<template>
  <div class="flex w-full">
    <div v-if="recipe && !isEditMode" class="flex w-full flex-col">
      <div class="mb-4 flex flex-col gap-4">
        <div class="mt-5 flex flex-row gap-4 md:mt-0">
          <span v-for="subdir in dir" :key="subdir">{{ subdir }}</span>
        </div>
        <div class="flex flex-row gap-4">
          <h1 v-if="recipe.metadata.title" class="text-3xl">
            {{ recipe.metadata.title }}
          </h1>
          <UDropdownMenu :items="menuItems" :content="{ align: 'start' }">
            <UButton
              icon="prime:bars"
              size="lg"
              color="secondary"
              variant="soft"
            />
          </UDropdownMenu>
        </div>
      </div>
      <div class="mb-4 flex flex-row gap-4">
        <div class="mt-1">Scale:</div>
        <UInputNumber
          v-model="servingsSpinner"
          :step="1"
          :min="1"
          :ui="{ base: 'w-24' }"
        />
        <UButton
          v-if="!shoppingStore.isRecipeInSelection(path)"
          size="md"
          color="primary"
          label="Add to shopping list"
          icon="material-symbols:add-shopping-cart-rounded"
          @click="addToShoppingList"
        />
        <UButton
          v-else
          size="sm"
          color="secondary"
          @click="editServingsInShoppingList"
          ><Icon class="text-lg" name="material-symbols:change-circle-rounded"
        /></UButton>
      </div>
      <div class="my-4 flex flex-col">
        <ul
          class="ml-6 list-disc text-sm text-neutral-600 dark:text-neutral-400"
        >
          <li v-for="(value, key) in nonTitleMetaData" :key>
            <b>{{ key }}: </b>
            <ULink
              v-if="typeof value === 'string' && value.startsWith('http')"
              :to="value"
              :boolean="true"
              target="_blank"
            >
              {{ value }}
            </ULink>
            <span v-else>{{ value }}</span>
          </li>
        </ul>
      </div>
      <div class="mt-0 grid grid-cols-1 md:mt-4 md:grid-cols-3">
        <div class="col-start-1">
          <USeparator
            :ui="{ border: 'border-gray-600' }"
            size="sm"
            class="mt-4 h-px md:mt-0 md:pr-10"
          />
          <h2 class="mt-1 mb-2 text-2xl font-bold">Ingredients</h2>
          <p v-if="recipe.servings" class="mb-4 text-sm">
            <b>Yield:</b> {{ recipe.servings }} servings
          </p>
          <IngredientList :ingredients="recipe.ingredients" />
        </div>
        <div class="col-span-2">
          <USeparator
            :ui="{ border: 'border-gray-600' }"
            size="sm"
            class="mt-10 h-px md:mt-0 md:pr-0"
          />
          <h2 class="mt-1 mb-4 text-2xl font-bold">Preparation</h2>
          <div v-for="section in recipe.sections" :key="section.name">
            <h3 v-if="section.name" class="mb-6 text-2xl">
              {{ section.name }}
            </h3>
            <div
              v-for="(step, stepIndex) in section.content"
              :key="stepIndex"
              class="mb-4"
            >
              <div v-if="'note' in step">{{ step.note }}</div>
              <div v-if="'items' in step">
                <h3 class="text-lg font-semibold">Step {{ stepIndex + 1 }}</h3>
                <PreparationItem
                  v-for="(item, itemIndex) in step.items"
                  :key="itemIndex"
                  :item
                  :recipe
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="flex w-full flex-col gap-4">
      <div class="flex flex-row gap-4">
        <span v-for="subdir in dir" :key="subdir">{{ subdir }}</span>
      </div>
      <UForm
        :state="formState"
        :schema="schema"
        class="flex w-full flex-col"
        @submit="onEditSubmit"
      >
        <UFormField name="recipe" :required="true">
          <UTextarea
            v-model="formState.recipe"
            class="w-full"
            :rows="20"
            fluid
          />
        </UFormField>
        <div class="mt-4 flex flex-row gap-4">
          <UButton type="submit" label="Save" class="resize-y" />
          <UButton
            type="button"
            color="secondary"
            label="Cancel"
            @click="onEditCancel"
          />
        </div>
      </UForm>
    </div>
  </div>
</template>
