<script setup lang="ts">
import type { CommandPaletteGroup } from "@nuxt/ui";

const emit = defineEmits<{ close: [boolean] }>();

const recipeStore = useRecipeStore();

const searchTerm = ref("");

const groups = computed<CommandPaletteGroup[]>(() => [
  {
    id: "recipes",
    label: searchTerm.value
      ? `Recipes matching "${searchTerm.value}"...`
      : "Recipes",
    items: recipeStore.recipeList.map((recipe) => ({
      label: recipe.title,
      suffix: recipe.dir || "/",
      icon: "material-symbols:menu-book-2-rounded",
      tags: recipe.tags,
      author: recipe.author,
      description: recipe.description,
      onSelect() {
        navigateTo(`/recipe/${pathJoin(recipe.dir, recipe.name)}`);
        emit("close", true);
      },
    })),
  },
]);

defineShortcuts({
  escape: () => emit("close", true),
});
</script>

<template>
  <UModal :close="false" :ui="{ content: 'sm:max-w-xl' }">
    <template #content>
      <UCommandPalette
        v-model:search-term="searchTerm"
        close
        :groups="groups"
        placeholder="Search recipes..."
        :fuse="{
          fuseOptions: {
            useTokenSearch: true,
            keys: ['label', 'tags', 'author', 'description'],
            threshold: 0.3,
          },
          matchAllWhenSearchEmpty: false,
        }"
        class="h-80"
        @update:open="emit('close', true)"
      />
    </template>
  </UModal>
</template>
