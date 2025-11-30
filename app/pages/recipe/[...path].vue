<script setup lang="ts">
import { Recipe } from "@tmlmt/cooklang-parser";
import type { FormSubmitEvent } from "@nuxt/ui";
import { FetchError } from "ofetch";

definePageMeta({
  title: "Cooklang Shopper - Recipe detail",
  description: "Weekly meal planner, from recipes to shopping cart",
});

const toast = useToast();

const route = useRoute();

if (!route.params.path) {
  throw createError({
    statusCode: 404,
    statusMessage: "Recipe not found",
  });
}

const path =
  typeof route.params.path === "string"
    ? route.params.path
    : route.params.path.join("/");

// Regex-based validation of provided path
if (!/^(?!\/)(?:[\p{L}\p{N}_ +%.-]+\/)*[\p{L}\p{N}_ +%.-]+$/u.test(path)) {
  throw createError({
    statusCode: 400,
    statusMessage: "Invalid recipe path",
  });
}

const shoppingStore = useShoppingStore();

const rawRecipe = ref<string>();
const res = await useFetch(`/api/recipe/${path}`);
rawRecipe.value = String(res.data.value);
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

//---------------------
// View / Edit Recipe
//---------------------

const isEditMode = ref(route.query.mode === "edit");
const formState = computed(() => {
  return {
    recipe: rawRecipe.value,
  };
});

const onEditSubmit = async (event: FormSubmitEvent<{ recipe: string }>) => {
  try {
    await $fetch(`/api/recipe/${path}`, {
      method: "POST",
      body: event.data,
    });
    toast.add({
      color: "success",
      title: "Success",
      description: "Recipe successfully saved",
      duration: 3000,
    });
    isEditMode.value = false;
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
};

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
    <div v-if="recipe" class="flex w-full flex-col">
      <div v-if="!isEditMode" class="flex w-full flex-col">
        <div class="flex flex-row gap-4">
          <h1 v-if="recipe.metadata.title" class="mb-4 text-3xl">
            {{ recipe.metadata.title }}
          </h1>
        </div>
        <div class="mb-4 flex flex-row gap-4">
          <UButton size="sm" color="primary" @click="isEditMode = true"
            ><Icon
              class="text-lg"
              name="material-symbols:edit-document-rounded"
          /></UButton>
          <UInputNumber
            v-model="servingsSpinner"
            :step="1"
            :min="1"
            :ui="{ base: 'w-24' }"
          />
          <UButton
            v-if="!shoppingStore.isRecipeInSelection(path)"
            size="sm"
            color="primary"
            @click="addToShoppingList"
            ><Icon
              class="text-lg"
              name="material-symbols:add-shopping-cart-rounded"
          /></UButton>
          <UButton
            v-else
            size="sm"
            color="secondary"
            @click="editServingsInShoppingList"
            ><Icon
              class="text-lg"
              name="material-symbols:change-circle-rounded"
          /></UButton>
        </div>
        <div class="my-4 flex flex-col">
          <ul
            class="ml-6 list-disc text-sm text-neutral-600 dark:text-neutral-400"
          >
            <li v-for="(value, key) in nonTitleMetaData" :key>
              {{ key }}:
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
        <div class="mt-4 grid grid-cols-3">
          <div class="col-start-1">
            <h2 class="mb-2 text-2xl">Ingredients</h2>
            <p v-if="recipe.servings" class="mb-4 text-sm">
              Pour {{ recipe.servings }} personnes
            </p>
            <IngredientList :ingredients="recipe.ingredients" />
          </div>
          <div class="col-span-2">
            <h2 class="mb-4 text-2xl">Preparation</h2>
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
        <!--<div class="mt-4 flex flex-row gap-4">
          <pre>{{ recipe }}</pre>
        </div>-->
      </div>
      <div v-else class="flex w-full flex-col">
        <UForm
          :state="formState"
          class="flex w-full flex-col"
          @submit="onEditSubmit"
        >
          <UFormField name="recipe">
            <UTextarea v-model="rawRecipe" class="w-full" :rows="20" fluid />
          </UFormField>
          <div class="mt-4 flex flex-row gap-4">
            <UButton type="submit" label="Save" class="resize-y" />
            <UButton
              type="button"
              color="secondary"
              label="Cancel"
              @click="isEditMode = false"
            />
          </div>
        </UForm>
      </div>
    </div>
  </div>
</template>
